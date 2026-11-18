const { Section, Enrollment } = require('../../models');

/*
 * Seat and waitlist bookkeeping for sections.
 *
 * MongoDB here runs as a single server (no replica set), so multi-document transactions
 * are not available. Instead every counter change is one atomic, conditional
 * findOneAndUpdate: two students racing for the last seat cannot both get it, because
 * only one update can match `enrolledCount < capacity`.
 *
 * Fairness rule: while anyone is on the waitlist, a free seat goes to the waitlist
 * (oldest first), never to a new registrant.
 */

const lt = (a, b) => ({ $expr: { $lt: [`$${a}`, `$${b}`] } });

// Take a seat for a new registrant. Returns true on success.
async function claimSeat(sectionId) {
    const updated = await Section.findOneAndUpdate(
        { _id: sectionId, status: 'open', waitlistCount: 0, ...lt('enrolledCount', 'capacity') },
        { $inc: { enrolledCount: 1 } }
    );
    return Boolean(updated);
}

// Take a waitlist slot. Returns true on success.
async function claimWaitlistSlot(sectionId) {
    const updated = await Section.findOneAndUpdate(
        { _id: sectionId, status: 'open', ...lt('waitlistCount', 'waitlistCapacity') },
        { $inc: { waitlistCount: 1 } }
    );
    return Boolean(updated);
}

const releaseSeat = (sectionId) =>
    Section.updateOne({ _id: sectionId, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });

const releaseWaitlistSlot = (sectionId) =>
    Section.updateOne({ _id: sectionId, waitlistCount: { $gt: 0 } }, { $inc: { waitlistCount: -1 } });

// Give every free seat to the waitlist, oldest first. Runs after a drop, a withdrawal,
// a capacity increase, and before each new registration (so seats freed some other way
// are not skipped). Cancelled sections are left alone. Returns the promoted enrollments.
async function fillFromWaitlist(sectionId) {
    const promoted = [];
    for (;;) {
        // reserve the seat first so a racing registration cannot also take it
        const seat = await Section.findOneAndUpdate(
            { _id: sectionId, status: { $ne: 'cancelled' }, waitlistCount: { $gt: 0 }, ...lt('enrolledCount', 'capacity') },
            { $inc: { enrolledCount: 1 } }
        );
        if (!seat) return promoted;

        const next = await Enrollment.findOneAndUpdate(
            { sectionId, status: 'waitlisted' },
            { $set: { status: 'enrolled', enrolledAt: new Date() } },
            { sort: { waitlistedAt: 1, _id: 1 }, returnDocument: 'after' }
        );
        if (!next) {
            // the counter said someone was waiting but nobody was: give the seat back
            await releaseSeat(sectionId);
            await Section.updateOne({ _id: sectionId }, { $set: { waitlistCount: 0 } });
            return promoted;
        }
        await releaseWaitlistSlot(sectionId);
        promoted.push(next);
    }
}

// 1-based place in line for a waitlisted enrollment
async function waitlistPosition(enrollment) {
    const ahead = await Enrollment.countDocuments({
        sectionId: enrollment.sectionId?._id ?? enrollment.sectionId,
        status: 'waitlisted',
        $or: [
            { waitlistedAt: { $lt: enrollment.waitlistedAt } },
            { waitlistedAt: enrollment.waitlistedAt, _id: { $lt: enrollment._id } }
        ]
    });
    return ahead + 1;
}

module.exports = { claimSeat, claimWaitlistSlot, releaseSeat, releaseWaitlistSlot, fillFromWaitlist, waitlistPosition };
