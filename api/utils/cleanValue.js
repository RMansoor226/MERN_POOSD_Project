function cleanValue(value) {
    if (value === undefined || value === null) return undefined;

    const trimmed = String(value).trim();
    return trimmed === "" ? undefined : trimmed;
}

module.exports = cleanValue;