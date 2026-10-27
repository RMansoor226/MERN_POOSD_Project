db = db.getSiblingDB('AppDB');

if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users');
}

if (!db.getCollectionNames().includes('classes')) {
  db.createCollection('classes');
}

let user = db.users.findOne({ login: "metoo" });
if (!user) {
  // This script runs in the Mongo shell, not through the User model, so the
  // password can't be hashed here automatically. The value below is the
  // bcrypt hash of "ucf123!", made with:
  //   node -e "console.log(require('bcryptjs').hashSync('ucf123!', 10))"
  const result = db.users.insertOne({
    firstName: "Me",
    lastName: "Too",
    login: "metoo",
    password: "$2b$10$dcjsaXblFddld53QThfQAu9WLK7.I4iek3NSg8ruIzpS28Cqd0AIK",
    email: "",
    role: "student",
    major: "Computer Science"
  });
  user = { _id: result.insertedId };
}

const userIdStr = user._id.toString();

const Classes = [
  { ProfessorName: "John Aedo", ClassCode: "COP4331", Prereq: ["idk"], Size: 50, Count: 30, userId: userIdStr},
  { ProfessorName: "among us", ClassCode: "SKL1234", Prereq: ["see something"], Size: 99, Count: 99, userId: userIdStr}
];

Classes.forEach(classes => {
  if (!db.classes.findOne({ ClassCode: classes.ClassCode })) {
    db.classes.insertOne(classes);
  }
});
