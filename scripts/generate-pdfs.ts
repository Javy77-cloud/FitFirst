import { generateSamplePdfs } from "../src/lib/fixtures/generate-pdfs";

generateSamplePdfs()
  .then(() => {
    console.log("Wrote sample PDFs to fixtures/");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
