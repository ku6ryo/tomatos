async function getUserMedia() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          exact: "environment",
        },
        width: {
          ideal: 600,
        },
        height: {
          ideal: 500,
        }
      },
    })
  } else {
    alert("getUserMedia not supported on your browser!");
  }
}

async function main () {
  const stats = new Stats();
  const model = await tf.loadGraphModel("/model/model.json");
  const stream = await getUserMedia()
  if (!stream) {
    throw new Error("media stream not available")
  }
  const cameraVideo = document.createElement("video");
  cameraVideo.srcObject = stream;
  cameraVideo.play();
  await (new Promise((resolve, reject) => {
    cameraVideo.addEventListener("playing", () => {
      resolve(0)
    })
  }))

//  const threshold = 0.75;
  const threshold = 0.7;
  const classesDir = {
    1: {
      name: 'Tomato',
      id: 1,
    },
    2: {
      name: 'Other',
      id: 2,
    }
  }

  const mainCanvas = document.createElement("canvas");
  mainCanvas.width = cameraVideo.videoWidth;
  mainCanvas.height = cameraVideo.videoHeight;
  const ctx = mainCanvas.getContext("2d");
  document.body.appendChild(mainCanvas)
  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  document.body.appendChild(stats.dom)

  const loop = async () => {
    stats.begin()
    tf.engine().startScope()
    await tf.setBackend("webgl")
    const tfImg = tf.browser.fromPixels(cameraVideo).toInt();
    const expandedImg = tfImg.transpose([0, 1, 2]).expandDims();
    const predictions = await model.executeAsync(expandedImg);
    /*
    for(let i = 0; i < 8; i++) {
      console.log(predictions[i].arraySync());
      console.log(predictions[i])
    }
    */
    // k7500: 1, 0, 3
    // t7500: 5, 7, 1
    const boxes = predictions[5].arraySync(); // shape [0, 100, 4]
    const scores = predictions[7].arraySync(); // shape [1, 100]
    const classes = predictions[1].dataSync(); // shape [1, 100]
    const detectionObjects = []
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(cameraVideo, 0, 0, mainCanvas.width, mainCanvas.height);

    scores[0].forEach((score, i) => {
      if (score > threshold) {
        const bbox = [];
        const minY = boxes[0][i][0] * cameraVideo.videoHeight;
        const minX = boxes[0][i][1] * cameraVideo.videoWidth;
        const maxY = boxes[0][i][2] * cameraVideo.videoHeight;
        const maxX = boxes[0][i][3] * cameraVideo.videoWidth;
        bbox[0] = minX;
        bbox[1] = minY;
        bbox[2] = maxX - minX;
        bbox[3] = maxY - minY;
        const c = classesDir[classes[i]]
        detectionObjects.push({
          class: classes[i],
          label: c ? c.name : 'Unknown',
          score: score.toFixed(4),
          bbox: bbox
        })
      }
    })
    detectionObjects.forEach(item => {
      const x = item['bbox'][0];
      const y = item['bbox'][1];
      const width = item['bbox'][2];
      const height = item['bbox'][3];

      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);

      // Draw the label background.
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(item["label"] + " " + (100 * item["score"]).toFixed(2) + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });
    console.log(detectionObjects)
    detectionObjects.forEach(item => {
      const x = item['bbox'][0];
      const y = item['bbox'][1];

      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(item["label"] + " " + (100*item["score"]).toFixed(2) + "%", x, y);
    });
    tf.engine().endScope()
    stats.end()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

window.addEventListener("DOMContentLoaded", () => {
  const button = document.createElement("button");
  button.innerHTML = "Start";
  button.addEventListener("click", () => {
    button.disabled = true
    main()
  });
  document.body.appendChild(button);
})