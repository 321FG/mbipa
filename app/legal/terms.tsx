import { LegalScreen } from "@/src/components/Common/LegalScreen";
import React from "react";
import { useTranslation } from "react-i18next";

type Section = { heading: string; body: string };

export default function TermsScreen() {
  const { t } = useTranslation();
  const sections =
    (t("legal.termsContent.sections", { returnObjects: true }) as Section[]) ||
    [];
  return (
    <LegalScreen
      title={t("legal.terms")}
      meta={t("legal.termsContent.meta")}
      intro={t("legal.termsContent.intro")}
      sections={sections}
    />
  );
}
