const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const xmlParser = new XMLParser();

const datasetDir = path.join(__dirname, '../dataset');
const annotationsDir = path.join(datasetDir, './annotations');
const imagessDir = path.join(datasetDir, './images');
const trainCsvPath = path.join(datasetDir, "./train_labels.csv");
const testCsvPath = path.join(datasetDir, "./test_labels.csv");

const HEADER = 'filename,width,height,class,xmin,ymin,xmax,ymax';
let train_csv_lines = [HEADER];
let test_csv_lines = [HEADER];

const annotationFiles = fs.readdirSync(annotationsDir)
annotationFiles.forEach((xmlFile) => {
  const xml = fs.readFileSync(path.join(annotationsDir, xmlFile), 'utf8').toString();
  const parsed = xmlParser.parse(xml)
  const { filename, size, object } = parsed.annotation
  const { width, height } = size
  function createRow(o) {
    const { name, bndbox } = o
    const { xmin, ymin, xmax, ymax } = bndbox
    return [
      filename,
      width,
      height,
      name,
      xmin,
      ymin,
      xmax,
      ymax
    ].join(",");
  }
  const rows = (() => {
    if (!object) {
      return []
    }
    if (Array.isArray(object)) {
      return object.map(createRow)
    } else {
      return [createRow(object)]
    }
  })()
  const forTrain = Math.random() > 0.2
  if (forTrain) {
    train_csv_lines = train_csv_lines.concat(rows)
  } else {
    test_csv_lines = test_csv_lines.concat(rows)
  }
})

fs.writeFileSync(trainCsvPath, train_csv_lines.join("\n"))
fs.writeFileSync(testCsvPath, test_csv_lines.join("\n"))
