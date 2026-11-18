import { createFileRoute } from "@tanstack/react-router";
import { CityPage } from "@/components/rahat-city-3d";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr } from "@/lib/i18n/core";

export const Route = createFileRoute("/city")({
  head: () =>
    seo({
      title: tr("مدينة رهط بوست التفاعلية 3D · شوارع وبيوت أهل رهط والنقب · رهط بوست"),
      description: tr(
        "تجوّل في شوارع وأحياء مدينة رهط بوست التفاعلية (3D / 2.5D): مسجد التقوى المركزي، مضافة النقب، دكان الأسبوع، وبيوت متابعي ومشتركي رهط بوست عبر إنستغرام وفيسبوك وتيك توك.",
      ),
      path: "/city",
      keywords: [
        "مدينة رهط بوست التفاعلية",
        "خريطة رهط ثلاثية الأبعاد",
        "مجتمع رهط والنقب",
        "رهط بوست 3D",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("مدينة رهط بوست التفاعلية"), path: "/city" }])],
    }),
  component: CityPage,
});
