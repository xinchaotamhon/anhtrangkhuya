"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Model = require("../src/model.js");
const Defaults = require("../src/defaults.js");

test("default set preserves all owner-supplied main questions", () => {
  assert.equal(Defaults.DEFAULT_QUESTIONS.length, 18);
  assert.ok(Defaults.DEFAULT_QUESTIONS.every((question) => question.id && question.prompt));
  assert.ok(Defaults.DEFAULT_QUESTIONS.some((question) => question.followUps.length > 0));
});

test("evaluation supports opposite scoring directions", () => {
  assert.equal(Model.evaluateBoolean("yes", "yes"), "positive");
  assert.equal(Model.evaluateBoolean("no", "yes"), "needs_improvement");
  assert.equal(Model.evaluateBoolean("no", "no"), "positive");
  assert.equal(Model.evaluateBoolean("yes", "no"), "needs_improvement");
  assert.equal(Model.evaluateBoolean(null, "no"), "unanswered");
});

test("a neutral main answer can be evaluated by a nested boolean follow-up", () => {
  const question = Defaults.DEFAULT_QUESTIONS.find((item) => item.id === "q-comparison");
  assert.equal(Model.evaluateQuestionAnswer(question, { value: "yes", followUps: { "f-positive": "yes" } }), "positive");
  assert.equal(Model.evaluateQuestionAnswer(question, { value: "yes", followUps: { "f-positive": "no" } }), "needs_improvement");
  assert.equal(Model.evaluateQuestionAnswer(question, { value: "no", followUps: {} }), "neutral");
});

test("saved entry snapshots do not change when definitions are edited later", () => {
  const questions = [Model.deepClone(Defaults.DEFAULT_QUESTIONS[0])];
  const entry = Model.createEntry({ date: "2026-07-18", answers: { "q-arrogance": { value: "no", followUps: {} } } }, questions);
  questions[0].prompt = "A later edited prompt";
  questions[0].positiveAnswer = "yes";
  assert.notEqual(entry.questionSnapshots[0].prompt, questions[0].prompt);
  assert.equal(entry.questionSnapshots[0].positiveAnswer, "no");
  assert.equal(Model.computeEntrySummary(entry).positive, 1);
});

test("summary reports completion and assessed direction", () => {
  const questions = Defaults.DEFAULT_QUESTIONS.slice(0, 2).map(Model.snapshotQuestion);
  const entry = {
    questionSnapshots: questions,
    answers: {
      "q-arrogance": { value: "no", followUps: {} },
      "q-single-meaning": { value: "yes", followUps: { "f-refocus": "A focused step" } }
    }
  };
  const summary = Model.computeEntrySummary(entry);
  assert.deepEqual(
    { total: summary.total, answered: summary.answered, positive: summary.positive, needsImprovement: summary.needsImprovement, completionPercent: summary.completionPercent },
    { total: 2, answered: 2, positive: 1, needsImprovement: 1, completionPercent: 100 }
  );
});

test("backup validator accepts complete backup and rejects a share package", () => {
  const backup = Model.createBackup({ questions: [], libraryItems: [], entries: [], settings: {} });
  assert.equal(Model.validateBackup(backup).valid, true);
  const share = Model.createSharePackage({ questions: [], libraryItems: [], entries: [{ private: true }] }, {});
  assert.equal(Model.validateBackup(share).valid, false);
});

test("share package never includes nightly entries", () => {
  const share = Model.createSharePackage({ questions: [], libraryItems: [], entries: [{ emotions: "private" }] }, {});
  assert.equal(share.fileType, Model.SHARE_FILE_TYPE);
  assert.equal(Object.prototype.hasOwnProperty.call(share, "entries"), false);
  assert.equal(JSON.stringify(share).includes("private"), false);
  assert.equal(Model.validateSharePackage(share).valid, true);
});

test("safe merge preserves conflicting local definitions as separate copies", () => {
  const current = [{ id: "same", label: "Local", definition: "Keep me" }];
  const incoming = [{ id: "same", label: "Shared", definition: "Different" }, { id: "new", label: "New" }];
  const merged = Model.mergeByIdSafely(current, incoming, "test");
  assert.equal(merged.items.length, 3);
  assert.equal(merged.report.added, 1);
  assert.equal(merged.report.clonedConflicts, 1);
  assert.equal(merged.items[0].definition, "Keep me");
  assert.notEqual(merged.items[1].id, "same");
});
