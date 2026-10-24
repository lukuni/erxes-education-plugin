import type { IPermissionConfig } from "erxes-api-shared/core-types";
import { manifest } from "./config.ts";

// Action names are global across the platform, not local to this plugin.
export const PRACTICE = "educationPractice";
export const TEACH = "educationTeach";

export const permissions: IPermissionConfig = {
  plugin: manifest.name,
  modules: [
    {
      name: "educationLearning",
      description: "Mongolian spelling dictation, script flashcards and rewards",
      scopeField: null,
      ownerFields: [],
      // Students only ever read and write their own progress (filtered by
      // user id in every resolver); teachers read the whole tenant.
      scopes: [{ name: "all", description: "Everything in this tenant" }],
      actions: [
        {
          name: PRACTICE,
          title: "Practice",
          description: "Take dictations, study flashcards, use the AI editor and the point shop",
        },
        {
          name: TEACH,
          title: "Teach",
          description: "See every student's progress, common mistakes, and create lessons",
        },
      ],
    },
  ],
  // Ready-made erxes permission groups: assign team members to them in
  // Settings → Permissions instead of granting actions one by one.
  defaultGroups: [
    {
      id: "education_students",
      name: "Education · Students",
      description: "Can practise and earn points",
      permissions: [
        { plugin: manifest.name, module: "educationLearning", actions: [PRACTICE], scope: "all" },
      ],
    },
    {
      id: "education_teachers",
      name: "Education · Teachers",
      description: "Can practise, see class analytics and create lessons",
      permissions: [
        {
          plugin: manifest.name,
          module: "educationLearning",
          actions: [PRACTICE, TEACH],
          scope: "all",
        },
      ],
    },
  ],
};
