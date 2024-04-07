import * as THREE from "three";
import {AmmoStart} from "./main.js";
import Ammo from "ammojs3";

var VSHADER_SOURCE
var FSHADER_SOURCE
var VSHADER_SOURCE_cube 
var FSHADER_SOURCE_cube

// Read shader from file
export function readShaderFile(fileName, shader,cube) {
  var request = new XMLHttpRequest();
  request.open('GET', fileName , true);

  request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status !== 404) {
      onReadShader(request.responseText, shader,cube);
    }
  }
  // Create a request to acquire the file
  request.send();                      // Send the request
}
  
  
// The shader is loaded from file
export function onReadShader(fileString, shader,cube) {
  if (shader == 'v') { // Vertex shader
    if(cube){
      VSHADER_SOURCE_cube = fileString;
    }
    else {
      VSHADER_SOURCE = fileString;
    }
    
  } else
  if (shader == 'f') { // Fragment shader
    if(cube){
      FSHADER_SOURCE_cube = fileString;
    }
    else{
      FSHADER_SOURCE = fileString;
    }
    
  }
  // When both are available, call start().
  if (VSHADER_SOURCE && FSHADER_SOURCE && VSHADER_SOURCE_cube && FSHADER_SOURCE_cube) {
    // shaders strings now available
    Ammo().then(AmmoStart(VSHADER_SOURCE,FSHADER_SOURCE,VSHADER_SOURCE_cube,FSHADER_SOURCE_cube))
  }
}
  
// Material definition for our material
export function bumpMaterial(vs_source,fs_source) {
  let uniforms = {
    SurfColor: {type: 'vec3', value: new THREE.Color(0.7, 0.6, 0.18)},
    BumpDensity: {type: 'float', value: 10.0}, // New uniform
    BumpSize: {type: 'float', value: 0.5}, // New uniform
    SpecularFactor: {type: 'float', value: 0.5} // New uniform
    }
  let phongShader = THREE.ShaderLib.phong;
  let mUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['lights'], uniforms]);
  var material =  new THREE.ShaderMaterial({
    uniforms: mUniforms,
    lights: true,
    vertexShader: vs_source,
    fragmentShader: fs_source,
  })
  return material;
}