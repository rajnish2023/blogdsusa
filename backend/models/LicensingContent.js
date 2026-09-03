const mongoose = require("mongoose");

const licensingContentSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, immutable: true },

    header: {
      eyebrow: String,
      heading: String,
      dek: String,
    },
    sections: {
      shapeTitle: String,
      entitiesLabel: String,
      countriesLabel: String,
      revenueLabel: String,
      usersTitle: String,
      usersSubtitle: String,
    },
    steppers: {
      fullLabel: String,
      fullHint: String,
      teamLabel: String,
      teamHint: String,
      deviceLabel: String,
      deviceHint: String,
      activityLabel: String,
      activityHint: String,
    },
    statement: {
      kicker: String,
      emptyText: String,
      perMonth: String,
      perYear: String,
      perThreeYears: String,
      modulesKicker: String,
      extensionsKicker: String,
      extensionsNote: String,
      footnote: String,
      coreOnlyPrefix: String,
      peekLabel: String,
    },
    locked: {
      kicker: String,
      verdictPrefix: String,
      capabilitiesSuffix: String,
      modulesSuffix: String,
      extensionsSuffix: String,
      ctaText: String,
    },
    form: {
      heading: String,
      body: String,
      ctaLabel: String,
      lockedHeading: String,
      lockedBody: String,
      lockedCtaLabel: String,
      sendingLabel: String,
      namePlaceholder: String,
      emailPlaceholder: String,
      companyPlaceholder: String,
      phonePlaceholder: String,
      renewalLabel: String,
      renewalPlaceholder: String,
    },
    success: {
      heading: String,
      body: String,
      unlockedHeading: String,
      unlockedBody: String,
    },
    errors: {
      submitFailed: String,
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("LicensingContent", licensingContentSchema);
