/**
 * App Profiles Registry — single source of truth for all build variants.
 *
 * Adding a new app (e.g. "committee", "contractor") = adding one entry here.
 * NO business code changes needed. All build tooling, Capacitor config,
 * icons/splash sync, deep links, push credentials, privacy manifest,
 * App Store metadata and feature flags are derived from this file.
 */

export type AppProfileId = string;

export type AppProfileFeatures = {
  residentDeals?: boolean;
  supplierScan?: boolean;
  budgetPlanner?: boolean;
  committeeQuotes?: boolean;
  voucherRedemption?: boolean;
  payments?: boolean;
  ai?: boolean;
  [key: string]: boolean | undefined;
};

export type AppProfile = {
  // Identity
  id: AppProfileId;
  appMode: string;
  appId: string;
  appName: string;
  shortName?: string;
  version: string;      // CFBundleShortVersionString (marketing, e.g. "1.0.0")
  buildNumber: string;  // CFBundleVersion (integer as string, e.g. "1")
  // Per-profile iOS usage descriptions (shown in permission prompts).
  iosUsageDescriptions: {
    camera?: string;
    photoLibrary?: string;
    photoLibraryAdd?: string;
    location?: string;
    microphone?: string;
    faceID?: string;
  };

  // Visual assets
  resourcesDir: string;
  iconPath: string;
  splashPath: string;
  splashBackgroundColor: string;
  themeColor: string;

  // Build output dirs
  webDir: string;
  iosDir: string;
  androidDir: string;

  // Deep links
  scheme?: string;
  universalLinks: {
    host: string;
    paths: string[];
  };

  // Push notifications
  push: {
    variant: string;
    apnsSecretPrefix: string;
    fcmConfigPath?: string;
  };

  // Apple config
  apple: {
    teamId?: string;
    entitlementsPath: string;
    provisioningProfileName?: string;
  };

  // Privacy manifest (PrivacyInfo.xcprivacy)
  privacyManifest: {
    collectedDataTypes: string[];
    accessedAPITypes: Array<{ type: string; reasons: string[] }>;
    trackingEnabled: boolean;
  };

  // App Store metadata (fastlane-compatible)
  storeMetadata: {
    primaryCategory: string;
    secondaryCategory?: string;
    keywords: string[];
    supportUrl: string;
    marketingUrl?: string;
    privacyPolicyUrl: string;
    description: { he: string; en?: string };
    promotionalText?: { he: string; en?: string };
    ageRating?: string;
  };

  // Feature flags per app
  features: AppProfileFeatures;
};

export const APP_PROFILES: AppProfile[] = [
  {
    id: "residents",
    appMode: "residents",
    appId: "il.co.groupbuild.residents",
    appName: "GroupBuild",
    shortName: "GroupBuild",
    version: "1.0.0",
    buildNumber: "1",
    iosUsageDescriptions: {
      photoLibrary: "העלאת תמונות ומסמכים לפרופיל, לפרויקטים ולהצעות מחיר",
      photoLibraryAdd: "שמירת שוברים ותעודות מהאפליקציה לגלריה",
      camera: "צילום מסמכים והעלאת תמונות פרופיל",
    },
    resourcesDir: "resources/residents",
    iconPath: "resources/residents/icon.png",
    splashPath: "resources/residents/splash.png",
    splashBackgroundColor: "#F7F5F0",
    themeColor: "#F8F6F1",
    webDir: "dist-residents",
    iosDir: "ios-residents",
    androidDir: "android-residents",
    scheme: "groupbuild-residents",
    universalLinks: {
      host: "groupbuild.co.il",
      paths: ["/r/*", "/share/deal/*"],
    },
    push: {
      variant: "residents",
      apnsSecretPrefix: "APNS_RESIDENTS",
      fcmConfigPath: "resources/residents/google-services.json",
    },
    apple: {
      entitlementsPath: "ios-residents/App/App/App.entitlements",
    },
    privacyManifest: {
      collectedDataTypes: [
        "EmailAddress",
        "PhoneNumber",
        "Name",
        "PreciseLocation",
        "PhotosorVideos",
      ],
      accessedAPITypes: [
        { type: "UserDefaults", reasons: ["CA92.1"] },
        { type: "FileTimestamp", reasons: ["C617.1"] },
        { type: "DiskSpace", reasons: ["E174.1"] },
      ],
      trackingEnabled: false,
    },
    storeMetadata: {
      primaryCategory: "LIFESTYLE",
      keywords: ["שיפוץ", "דירה", "קבוצת רכישה", "דיירים", "בית"],
      supportUrl: "https://groupbuild.co.il/support",
      privacyPolicyUrl: "https://groupbuild.co.il/privacy",
      description: {
        he: "GroupBuild — רכישה קבוצתית לדיירים, משפצים וועדי בתים.",
      },
      ageRating: "4+",
    },
    features: {
      residentDeals: true,
      budgetPlanner: true,
      voucherRedemption: true,
      payments: true,
      ai: true,
      supplierScan: false,
      committeeQuotes: false,
    },
  },
  {
    id: "suppliers",
    appMode: "suppliers",
    appId: "il.co.groupbuild.suppliers",
    appName: "GroupBuild לעסקים",
    shortName: "GB Business",
    version: "1.0.0",
    buildNumber: "1",
    iosUsageDescriptions: {
      camera: "סריקת שוברי הטבה של דיירים בבית העסק",
      photoLibrary: "העלאת תמונות של פרויקטים ועבודות לפרופיל הספק",
      photoLibraryAdd: "שמירת הצעות מחיר ותעודות מהאפליקציה לגלריה",
    },
    resourcesDir: "resources/suppliers",
    iconPath: "resources/suppliers/icon.png",
    splashPath: "resources/suppliers/splash.png",
    splashBackgroundColor: "#0E6B5A",
    themeColor: "#0E6B5A",
    webDir: "dist-suppliers",
    iosDir: "ios-suppliers",
    androidDir: "android-suppliers",
    scheme: "groupbuild-suppliers",
    universalLinks: {
      host: "groupbuild.co.il",
      paths: ["/b/*"],
    },
    push: {
      variant: "suppliers",
      apnsSecretPrefix: "APNS_SUPPLIERS",
      fcmConfigPath: "resources/suppliers/google-services.json",
    },
    apple: {
      entitlementsPath: "ios-suppliers/App/App/App.entitlements",
    },
    privacyManifest: {
      collectedDataTypes: [
        "EmailAddress",
        "PhoneNumber",
        "Name",
        "PhotosorVideos",
      ],
      accessedAPITypes: [
        { type: "UserDefaults", reasons: ["CA92.1"] },
        { type: "FileTimestamp", reasons: ["C617.1"] },
        { type: "DiskSpace", reasons: ["E174.1"] },
      ],
      trackingEnabled: false,
    },
    storeMetadata: {
      primaryCategory: "BUSINESS",
      keywords: ["ספקים", "קבלנים", "לידים", "הצעות", "עסקים"],
      supportUrl: "https://groupbuild.co.il/support",
      privacyPolicyUrl: "https://groupbuild.co.il/privacy",
      description: {
        he: "GroupBuild לעסקים — ניהול לידים, הצעות ואנליטיקות לספקים וקבלנים.",
      },
      ageRating: "4+",
    },
    features: {
      supplierScan: true,
      ai: true,
      payments: true,
      residentDeals: false,
      budgetPlanner: false,
      voucherRedemption: false,
      committeeQuotes: false,
    },
  },
  // Future profiles (committee, contractor, …) — add an entry, no code changes.
];

export function getProfile(id: string | undefined): AppProfile | undefined {
  if (!id) return undefined;
  return APP_PROFILES.find((p) => p.id === id);
}

export function requireProfile(id: string | undefined): AppProfile {
  const p = getProfile(id);
  if (!p) {
    throw new Error(
      `[app-profiles] Unknown APP_PROFILE="${id}". Known: ${APP_PROFILES.map(
        (x) => x.id
      ).join(", ")}`
    );
  }
  return p;
}
