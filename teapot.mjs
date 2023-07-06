// Client code for loading and rendering the teapot.
// This only needs to run on the latest version of Chrome.

/**
 * Loads the teapot geometry.
 * @returns {Promise<{indexes: Uint16Array, vertices: Float32Array}>}
 */
async function loadTeapotGeometry() {
  // Fetch the teapot obj file
  const teapotResponse = await fetch("/teapot.obj");
  const teapotText = await teapotResponse.text();

  const vertices = []
  const indexes = []
  const normals = []


  // Parse the obj file line by line
  for (const line of teapotText.split("\n")) {
      const items = line.trim().split(" ")

      switch (items[0]) {
        case "v":
          vertices.push(...items.slice(1, 4).map((v) => parseFloat(v)/5));
          break;
        case "vn":
          normals.push(...items.slice(1, 4).map((v) => parseFloat(v)));
          break
        case "f":
          const ndx = items.slice(1).map((v) => {
            const indices = v.split("/").map((index) => parseInt(index, 10) - 1);
            return indices[0];
          });
          switch (ndx.length) {
            case 3:
              indexes.push(ndx[0], ndx[1], ndx[2]);
              break;
            case 4:
              indexes.push(ndx[0], ndx[1], ndx[2], ndx[2], ndx[3], ndx[0]);
              break;
          }
          break;
      }
  }

  return {
    indexes: new Uint16Array(indexes),
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals)
  };
}

/**
 * Sets up a shader program that renders a red object.
 * @param {WebGLRenderingContext} context
 * @returns {WebGLProgram}
 */
function setupShaderProgram(context) {
  const vertexShader = context.createShader(context.VERTEX_SHADER);
  const fragmentShader = context.createShader(context.FRAGMENT_SHADER);

  context.shaderSource(vertexShader, `
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 modelViewMatrix;
    varying vec3 vNormal;
    void main() {
      gl_Position = modelViewMatrix * vec4(position, 1);
      vNormal = normal;
    }
  `);
  context.shaderSource(fragmentShader, `
    precision mediump float;
    varying vec3 vNormal;
    void main() {
      vec3 ambient = vec3(0.5, 0.5, 0.5); // color - grey

      // diffuse (lambertian) lighting
      // lightColor, lightSource, normal, diffuseStrength
      vec3 normal = normalize(vNormal.xyz);
      vec3 lightColor = vec3(1.0, 1.0, 1.0); // color - white
      vec3 lightSource = vec3(1.0, 2.0, 1.0); // coord - (1, 0, 0)
      float diffuseStrength = max(0.0, dot(lightSource, normal));
      vec3 diffuse = diffuseStrength * lightColor;

      // specular light
      // lightColor, lightSource, normal, specularStrength, viewSource
      vec3 cameraSource = vec3(0.0, 0.0, 1.0);
      vec3 viewSource = normalize(cameraSource);
      vec3 reflectSource = normalize(reflect(-lightSource, normal));
      float specularStrength = max(0.0, dot(viewSource, reflectSource));
      specularStrength = pow(specularStrength, 256.0);
      vec3 specular = specularStrength * lightColor;

      // lighting = ambient + diffuse + specular
      vec3 lighting = vec3(0.0, 0.0, 0.0); // color - black
      lighting = ambient * 0.0 + diffuse * 0.5 + specular * 0.5;

      // color = modelColor * lighting
      vec3 modelColor = vec3(0.75, 0, 0);
      vec3 color = modelColor * lighting;

      gl_FragColor = vec4(color, 1.0);

    }
  `);

  context.compileShader(vertexShader);
  context.compileShader(fragmentShader);

  const program = context.createProgram();
  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);

  return program;
}

async function renderTeapot() {
  // Create rendering context
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
  const canvas = document.getElementById("canvas");
  /** @type {WebGLRenderingContext} */
  const context = canvas.getContext("webgl");

  // Load teapot geometry
  const teapotGeometry = await loadTeapotGeometry();

  // Bind indexes to ELEMENT_ARRAY_BUFFER
  const index = context.createBuffer();
  context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, index);
  context.bufferData(context.ELEMENT_ARRAY_BUFFER, teapotGeometry.indexes, context.STATIC_DRAW);

  // Use the red shader program
  const program = setupShaderProgram(context);
  context.useProgram(program);

  // Bind vertices to ARRAY_BUFFER
  const position = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, position);
  context.bufferData(context.ARRAY_BUFFER, teapotGeometry.vertices, context.STATIC_DRAW);

  // Bind position to it shader attribute
  const positionLocation = context.getAttribLocation(program, "position");
  context.enableVertexAttribArray(positionLocation);
  context.vertexAttribPointer(positionLocation, 3, context.FLOAT, false, 0, 0);

  // Bind normal to ARRAY_BUFFER
  const normal = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, normal);
  context.bufferData(context.ARRAY_BUFFER, teapotGeometry.normals, context.STATIC_DRAW);

  // Bind normal to it shader attribute
  const normalLocation = context.getAttribLocation(program, "normal");
  context.enableVertexAttribArray(normalLocation);
  context.vertexAttribPointer(normalLocation, 3, context.FLOAT, false, 0, 0);


  let firstFrame = performance.now();

  const renderLoop = () => {
    const delta = performance.now() - firstFrame;

    // Set a rotating model view matrix
    const modelViewMatrixLocation = context.getUniformLocation(program, "modelViewMatrix");
    const rotation = delta % 10000 / 10000 * Math.PI * 2;
    context.uniformMatrix4fv(modelViewMatrixLocation, false, new Float32Array([
      Math.cos(rotation), 0, Math.sin(rotation), 0,
      0, 1, 0, 0,
      -Math.sin(rotation), 0, Math.cos(rotation), 0,
      0, 0, 0, 1
    ]));

    // Render the teapot
    context.drawElements(context.TRIANGLES, teapotGeometry.indexes.length, context.UNSIGNED_SHORT, 0);
    context.flush();

    // Request another frame
    requestAnimationFrame(renderLoop);
  };

  // Start the render loop
  requestAnimationFrame(renderLoop);
}

renderTeapot();
