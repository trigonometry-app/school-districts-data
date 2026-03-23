import { XMLParser } from "fast-xml-parser";

import { fetchText } from "../http.js";

const FLASHALERT_XML_URL =
  "https://www.flashalertnewswire.net/IIN/reportsX/flashnews_xml2.php?RegionID=";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
});

const ensureArray = (value, label) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value) {
    console.warn(`FlashAlert: coercing ${label} to an array.`);
    return [value];
  }

  console.warn(`FlashAlert: using empty array in place of ${label}.`);
  return [];
};

const findNodes = (value, key, output = []) => {
  if (!value || typeof value != "object") {
    return output;
  }

  for (const [currentKey, currentValue] of Object.entries(value)) {
    if (currentKey == key) {
      output.push(currentValue);
    }

    if (currentValue && typeof currentValue == "object") {
      findNodes(currentValue, key, output);
    }
  }

  return output;
};

export const loadDistrictAlerts = async (news) => {
  const xml = await fetchText(`${FLASHALERT_XML_URL}${news.regionId}`);
  const parsed = parser.parse(xml);

  const newsItems = findNodes(parsed, "news_category").flatMap((category) =>
    ensureArray(category.news_report, "news_report").map((report) => ({
      effectiveDate: report.effective_date ?? "",
      org: report.orgname.trim(),
      message: report.headline.trim() || report.detail.trim(),
    })),
  );

  const emergencyItems = findNodes(parsed, "emergency_category").flatMap(
    (category) =>
      ensureArray(category.emergency_report, "emergency_report").map(
        (report) => ({
          effectiveDate: report.effective_date ?? "",
          org: report.orgname.trim(),
          message: report.headline.trim() || report.detail.trim(),
        }),
      ),
  );

  const items = [...newsItems, ...emergencyItems]
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
    .filter((item) => item.org == news.org)
    .map((item) => item.message)
    .filter(Boolean);

  return [...new Set(items)];
};
