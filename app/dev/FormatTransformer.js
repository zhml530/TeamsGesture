"use strict";
// Decoder 
//  Vertex Shader 
let programDecoder;
let positionLocationDecoder;
let texcoordLocationDecoder;

//  Fragment Shader 
let textureLocationYDecoder;
let textureLocationUVDecoder;

//  Fragment Shader 
let initEncoderDecoderContextFlag = false;
let rgbImage;

let canvas;
let gl;
canvas = document.createElement("canvas");
gl = canvas.getContext("webgl");

let RGBImageCanvas;
let RGBImageCanvasCtx;
RGBImageCanvas = document.getElementById("RGBImageCanvas");
RGBImageCanvasCtx = RGBImageCanvas.getContext("2d");

let currentHeight;
let currentWidth;

function getShader(source, type){
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("ERROR IN SHADER : " + gl.getShaderInfoLog(shader));
    return false;
  }
  return shader;
}

function resizeCanvas(canvas, width, height){
  canvas.width = width
  canvas.height = height
}

function createGlProgram(){
  var vertexShaderSourceCode = `
      attribute vec4 position;
      attribute vec2 texCoord;
      varying vec2 v_texCoord;  
      void main()  
      {            
      gl_Position = position;
      v_texCoord = texCoord; 
      }
    `;

  var fragmentShaderSourceCode = `
      precision mediump float; 
      varying vec2 v_texCoord; 
      uniform sampler2D textureY; 
      uniform sampler2D textureUV; 
                           
      vec3 yuv2r = vec3(1.164, 0.0, 1.596);
      vec3 yuv2g = vec3(1.164, -0.391, -0.813);
      vec3 yuv2b = vec3(1.164, 2.018, 0.0);
          
      vec3 uv12_to_rgb(vec2 texCoord){
         vec3 yuv; 
         yuv.x = texture2D(textureY, texCoord).r - 0.0625;
         yuv.y = texture2D(textureUV, texCoord).r - 0.5;
         yuv.z = texture2D(textureUV, texCoord).a - 0.5;
         vec3 rgb = vec3(dot(yuv, yuv2r), dot(yuv, yuv2g), dot(yuv, yuv2b));
         return rgb; 
      }
      void main() 
      { 
         gl_FragColor = vec4(uv12_to_rgb(v_texCoord), 1); 
      } 
  `;
  
  var vertexShader = getShader(vertexShaderSourceCode, gl.VERTEX_SHADER);
  var fragmentShader = getShader(fragmentShaderSourceCode, gl.FRAGMENT_SHADER);

  var program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  return program;
}

function initFramebuffer(width, height){
  if (rgbImage === undefined || width != currentWidth || height != currentHeight){
    rgbImage = new Uint8Array(width * height * 4);
  }
}

function initDecoderDecoderContext(){

  // setup opengl context
  if (!initEncoderDecoderContextFlag){

    // init decoder
    programDecoder = createGlProgram()
    // get attribute
    positionLocationDecoder = gl.getAttribLocation(programDecoder, "position");
    texcoordLocationDecoder = gl.getAttribLocation(programDecoder, "texCoord");
    // get uniforms
    textureLocationYDecoder = gl.getUniformLocation(programDecoder, "textureY");
    textureLocationUVDecoder = gl.getUniformLocation(programDecoder, "textureUV");

    initEncoderDecoderContextFlag= true;
  }
}

 function nv12ToRgbTranform(image){

  resizeCanvas(canvas, image.width, image.height);
  resizeCanvas(RGBImageCanvas, image.width, image.height);

  initFramebuffer(image.width, image.height);
  initDecoderDecoderContext();

  nv12ToRgb(image.data, image.width, image.height, rgbImage);

  var imageData = new ImageData(new Uint8ClampedArray(rgbImage), image.width, image.height);
  RGBImageCanvasCtx.putImageData(imageData, 0, 0);

  return rgbImage;
  
}

function nv12ToRgb(image, width, height, outputImage) {
  /** @type {HTMLCanvasElement} */
  if (!gl) {
    return;
  }

  // Create a buffer to put three 2d clip space points in
  //var positionBuffer = gl.createBuffer();
  var startTime = Date.now();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  var vertices = new Float32Array([
    -1, -1, 0, 0.0,  0.0,
    1, -1, 0, 1.0,  0.0,
    -1, 1, 0, 0.0,  1.0,
    1, 1, 0, 1.0,  1.0,
 ])

  var indices = new Int16Array([
    0, 1, 2, 
    2, 1, 3
  ])

  var verticeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var indicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.useProgram(programDecoder)
  // Create a texture.
  // texture1
  var textureY = gl.createTexture();
  gl.uniform1i(textureLocationYDecoder, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureY);
  
  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0,  gl.LUMINANCE, gl.UNSIGNED_BYTE, image.slice(0, width * height));

  // texture2
  var textureUV = gl.createTexture();
  gl.uniform1i(textureLocationUVDecoder, 1);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureUV);
  
  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, width/2, height/2, 0,  gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, image.slice(width * height, image.length));

  // Tell WebglDecoder how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Tell it to use our program (pair of shaders)
  gl.useProgram(programDecoder);

  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, verticeBuffer);
  gl.vertexAttribPointer(positionLocationDecoder, 3, gl.FLOAT, false, 5 * 4, 0);
  gl.vertexAttribPointer(texcoordLocationDecoder, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
  gl.enableVertexAttribArray(positionLocationDecoder);
  gl.enableVertexAttribArray(texcoordLocationDecoder);

  // Draw the rectangle.
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  // get canvas output
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, outputImage);

}

