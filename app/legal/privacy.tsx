import { LegalScreen } from "@/src/components/Common/LegalScreen";
import React from "react";
import { useTranslation } from "react-i18next";

type Section = { heading: string; body: string };

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const sections =
    (t("legal.privacyContent.sections", {
      returnObjects: true,
    }) as Section[]) || [];
  return (
    <LegalScreen
      title={t("legal.privacy")}
      meta={t("legal.privacyContent.meta")}
      intro={t("legal.privacyContent.intro")}
      sections={sections}
    />
  );
}
