import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/trugo-sync');
const projects = mongoose.connection.collection('projects');
const tasks = mongoose.connection.collection('tasks');
const milestones = mongoose.connection.collection('milestones');
const files = mongoose.connection.collection('projectfiles');

const before = await projects
  .find({
    $or: [
      { name: { $regex: /^(Smoke Project|API Test Project)/i } },
      { clientName: { $regex: /^Smoke Client/i } },
      { description: { $regex: /^API smoke$/i } },
    ],
  })
  .project({ name: 1 })
  .toArray();

console.log('Smoke projects before:', before.length);
before.forEach((p) => console.log(' -', p.name));

const ids = before.map((p) => p._id);
const t = await tasks.deleteMany({
  $or: [
    { projectId: { $in: ids } },
    { title: { $regex: /^Smoke Task/i } },
    { description: { $regex: /^API smoke$/i } },
  ],
});
await milestones.deleteMany({ projectId: { $in: ids } });
await files.deleteMany({ projectId: { $in: ids } });
const p = await projects.deleteMany({ _id: { $in: ids } });

console.log('Deleted projects:', p.deletedCount, 'tasks:', t.deletedCount);

const after = await projects
  .find({ name: { $regex: /^(Smoke Project|API Test Project)/i } })
  .toArray();
console.log('Smoke projects after:', after.length);

await mongoose.disconnect();
