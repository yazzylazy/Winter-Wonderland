import * as THREE from "three";
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GUI } from "dat.gui";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';


let scene = new THREE.Scene();
scene.background = new THREE.Color("white");

let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0,50,50);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
// make values computed by render properly display on monitor
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
//renderer.shadowMap.enabled = true;
//renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// initalize environment mapping variable
let envmap;

// constant for height of mountains
const MAX_HEIGHT = 10;

// set orbit controls to always look at origin
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

// animation loop
(async function(){
    // process the environment app to use in our materials
    let prem = new THREE.PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(THREE.FloatType).loadAsync("assests/snowy_hillside_4k.hdr");
    envmap = prem.fromEquirectangular(envmapTexture).texture;
    
    const simplex = new SimplexNoise(); // optional seed as a string parameter

    // creating map of hexagons
    for(let i=-10; i<=10; i++){
        for(let j=-10; j<=10; j++){
            
            let position = titleToPosition(i,j);

            // if the radius of heaxgon outside of circle radius of size 16, we skip it
            if(position.length()>16) continue;

            // +1 * 0.5 is a normalization factor we add to keep the noise between [0,1]
            let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
            // makes mountains a little steeper
            noise = Math.pow(noise, 1.5);

            makeHex(noise * MAX_HEIGHT, position, envmap);
        }
    }

    // create a new hexagon geomtry with added environment material mapping
    makeHex(3,new THREE.Vector2(0,0));
    let hexagonMesh = new THREE.Mesh(
        hexagonGeos,
        new THREE.MeshStandardMaterial({
            envMap: envmap,
            flatShading: true,
        })
    );
    
    scene.add(hexagonMesh);

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene,camera);
    });
})();

// change i,j values to vector coordinates in order to adjust hexagon offset
function titleToPosition(X,Y){
    return new THREE.Vector2((X +(Y%2)*0.5)*1.77,Y*1.535);
}


// place holder hex to use 
let hexagonGeos = new THREE.BoxGeometry(0,0,0);


function hexGeo(height,position){
    let geo  = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);
    
    return geo;
}

// merge geometries together to reduce the amount of draw calls
function makeHex(height,position){
    let geo  = hexGeo(height,position);
    hexagonGeos = mergeGeometries([hexagonGeos,geo])
}

