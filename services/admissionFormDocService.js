const puppeteer = require("puppeteer");
const {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  convertInchesToTwip,
} = require("docx");
const { buildAdmissionFormHtml } = require("./admissionFormPrintService");

const PX_PER_INCH = 96;
const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 13;
const PAGE_MARGIN_IN = 0.1;

const getSinglePageImageSizePx = (widthPx, heightPx) => {
  const marginIn = 0.2;
  const maxWidthIn = PAGE_WIDTH_IN - marginIn;
  const maxHeightIn = PAGE_HEIGHT_IN - marginIn;

  let widthIn = widthPx / PX_PER_INCH;
  let heightIn = heightPx / PX_PER_INCH;

  const scale = Math.min(1, maxWidthIn / widthIn, maxHeightIn / heightIn);
  widthIn *= scale;
  heightIn *= scale;

  return {
    widthPx: Math.round(widthIn * PX_PER_INCH),
    heightPx: Math.round(heightIn * PX_PER_INCH),
  };
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const renderAdmissionFormImage = async (application) => {
  const html = buildAdmissionFormHtml(application, {
    autoPrint: false,
    includeToolbar: false,
  });

  const launchOptions = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);
  let screenshot;
  let clip;

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 816,
      height: 1600,
      deviceScaleFactor: 1,
    });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForSelector(".sheet", { timeout: 15000 });
    await delay(800);

    clip = await page.evaluate(() => {
      const sheet = document.querySelector(".sheet");
      if (!sheet) return null;

      const rect = sheet.getBoundingClientRect();
      return {
        x: Math.max(0, Math.floor(rect.x)),
        y: Math.max(0, Math.floor(rect.y)),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      };
    });

    if (!clip?.width || !clip?.height) {
      throw new Error("Admission form sheet element not found");
    }

    screenshot = await page.screenshot({
      type: "png",
      clip,
      omitBackground: false,
    });
  } finally {
    await browser.close().catch(() => {});
  }

  return { screenshot, clip };
};

const buildAdmissionFormDocx = async (application) => {
  const { screenshot, clip } = await renderAdmissionFormImage(application);
  const { widthPx, heightPx } = getSinglePageImageSizePx(clip.width, clip.height);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(PAGE_WIDTH_IN),
              height: convertInchesToTwip(PAGE_HEIGHT_IN),
            },
            margin: {
              top: convertInchesToTwip(PAGE_MARGIN_IN),
              right: convertInchesToTwip(PAGE_MARGIN_IN),
              bottom: convertInchesToTwip(PAGE_MARGIN_IN),
              left: convertInchesToTwip(PAGE_MARGIN_IN),
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0, line: 0 },
            children: [
              new ImageRun({
                type: "png",
                data: screenshot,
                transformation: {
                  width: widthPx,
                  height: heightPx,
                },
                altText: {
                  title: "Application for Admission",
                  description: "Exact Colleges of Asia admission form",
                  name: "Admission Form",
                },
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
};

module.exports = {
  buildAdmissionFormDocx,
};
