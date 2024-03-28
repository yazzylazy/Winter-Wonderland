import * as THREE from "three";
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GUI } from "dat.gui";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';


let scene = new THREE.Scene();
scene.background = new THREE.Color("#d6d1ff");

let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0,40,40);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
// make values computed by render properly display on monitor
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
// enabling shadows in the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);


// adding a point light
const light = new THREE.PointLight( new THREE.Color("#fffeed").convertSRGBToLinear().convertSRGBToLinear(),200,300); // convert color of the light so renderer understands
light.position.set(10,20,10);

// make sure the light can cast shadows
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 100;

// add the light to our scene
scene.add(light);

// initalize environment mapping variable
let envmap;

// constant for height of mountains
const MAX_HEIGHT = 10;
const SNOW_HEIGHT = MAX_HEIGHT * 0.8;
const snowSTONE_HEIGHT = MAX_HEIGHT * 0.7;
const SNOW2_HEIGHT = MAX_HEIGHT * 0.5;
const ICE_HEIGHT = MAX_HEIGHT * 0.3;
const mossSNOW_HEIGHT = MAX_HEIGHT * 0.0;



// set orbit controls to always look at origin
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

// animation loop
(async function(){
    // process the environment app to use in our materials
    let prem = new THREE.PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(THREE.FloatType).loadAsync("assets/snowy_hillside_4k.hdr");
    envmap = prem.fromEquirectangular(envmapTexture).texture;

    let textures = {
        snow2: await new THREE.TextureLoader().loadAsync("assets/snow2.jpg"),
        snow: await new THREE.TextureLoader().loadAsync("assets/snow.jpg"),
        mossSnow: await new THREE.TextureLoader().loadAsync("assets/mossSnow.jpg"),
        ice: await new THREE.TextureLoader().loadAsync("assets/ice.jpg"),
        SnowStone: await new THREE.TextureLoader().loadAsync("assets/snowStone.jpg"),
        container: await new THREE.TextureLoader().loadAsync("assets/houseFloor.jpg"),
        wood: await new THREE.TextureLoader().loadAsync("assets/wood.jpg"),
        glass: await new THREE.TextureLoader().loadAsync("assets/glass.jpg")
      };
    
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

    // create a new hexagon geomtry with added environment material mapping depending on each type of hexagon
    
    let stoneMesh = hexMesh(stoneGeo,textures.SnowStone);
    let iceMesh = hexMesh(iceGeo,textures.ice);
    let snowMesh = hexMesh(snowGeo,textures.snow);
    let snow2Mesh = hexMesh(snow2Geo,textures.snow2);
    let snowMossMesh = hexMesh(mossGeo,textures.mossSnow);
    
    scene.add(stoneMesh,iceMesh,snowMesh,snow2Mesh,snowMossMesh);


    // create a snowy transperent mesh encapuslating all bottom hexagons
    let snowFloorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(17, 17, MAX_HEIGHT * 0.13, 50),
        new THREE.MeshPhysicalMaterial({
          envMap: envmap,
          color: new THREE.Color("#f5fcfb").convertSRGBToLinear().multiplyScalar(3),
          ior: 1.3,
          transmission: 1,
          transparent: true,
          thickness: 0.5,
          envMapIntensity: 0.2, 
          roughness: 1,
          metalness: 0.025,
          roughnessMap: textures.snow,
          metalnessMap: textures.snow,
        })
      );
    snowFloorMesh.receiveShadow = true;
    snowFloorMesh.rotation.y = -Math.PI * 0.333 * 0.5;
    snowFloorMesh.position.set(0, MAX_HEIGHT * 0.0, 0);
    scene.add(snowFloorMesh);

    //add another cylinder for walls around our other meshes
    let mapContainer =new  THREE.Mesh(
        new  THREE.CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
        new  THREE.MeshPhysicalMaterial({
            envMap: envmap,
            map: textures.container,
            envMapIntensity: 0.2, 
            side: THREE.DoubleSide, // render both sides
        })
      );
    mapContainer.receiveShadow = true;
    mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
    mapContainer.position.set(0, MAX_HEIGHT * 0.0, 0);
    scene.add(mapContainer);

    // add a cylinder for the floor around the entire mesh
    let mapFloor = new THREE.Mesh(
        new  THREE.CylinderGeometry(21, 18.5, MAX_HEIGHT * 0.1, 50),
        new  THREE.MeshPhysicalMaterial({
            envMap: envmap,
            map: textures.wood,
            envMapIntensity: 0.1, 
            side:  THREE.DoubleSide,
        })
      );
    mapFloor.receiveShadow = true;
    mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
    scene.add(mapFloor);
    
    // and random clouds
    clouds();

     // create a snowy transperent mesh encapuslating all bottom hexagons
    let Globe = new THREE.Mesh(
        new THREE.SphereGeometry(21, 50, 50,0,Math.PI * 2,0,1.57),
        new THREE.MeshPhysicalMaterial({
            metalness: 0,
            roughness: 0,
            transmission: 1,
            ior: 1.7,
            clearcoat: 1.0,
            thickness: 0.5
        })
    );
    Globe.receiveShadow = true;
    scene.add(Globe);

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
let mossGeo = new THREE.BoxGeometry(0,0,0);
let snowGeo = new THREE.BoxGeometry(0,0,0);
let snow2Geo = new THREE.BoxGeometry(0,0,0);
let stoneGeo = new THREE.BoxGeometry(0,0,0);
let iceGeo = new THREE.BoxGeometry(0,0,0);


function hexGeo(height,position){
    let geo  = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);
    
    return geo;
}

// merge geometries together to reduce the amount of draw calls
function makeHex(height,position){
    let geo  = hexGeo(height,position);

    // adding the hexagons depending on which type of texture 
    if (height > SNOW_HEIGHT){
        snowGeo =  mergeGeometries([geo,snowGeo])

        if(Math.random() > 0.5){
            snowGeo = mergeGeometries([snowGeo,tree(height,position)])
        }

    } else if(height > snowSTONE_HEIGHT){
        stoneGeo = mergeGeometries([geo,stoneGeo])

        if(Math.random() > 0.8){
            stoneGeo = mergeGeometries([stoneGeo,stone(height,position)])
        }

    } else if(height > SNOW2_HEIGHT){
        snow2Geo =  mergeGeometries([geo,snow2Geo])

        if(Math.random() > 0.5){
            snow2Geo = mergeGeometries([snow2Geo,tree(height,position)])
        }

    }  else if(height > ICE_HEIGHT){
        iceGeo =  mergeGeometries([geo,iceGeo])
    }  else if(height > mossSNOW_HEIGHT){
        mossGeo =  mergeGeometries([geo,mossGeo])

        if(Math.random() > 0.8){
            mossGeo = mergeGeometries([mossGeo,stone(height,position)])
        }
    }
}

// function to create the hexagon mesh with enviromental mapping
function hexMesh(geo,map){
    let mat = new THREE.MeshPhysicalMaterial({
        envMap: envmap,
        envMapIntensity: 0.3,
        flatShading: true,
        map
    });

    let mesh = new THREE.Mesh(geo,mat)
    // making sure our mesh can cast shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

// create stones of different sizes
function stone (height,position){
    // random position for variation of positions of rocks
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;

    const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz)

    return geo;
}

// create pyramid like trees of different siZes
function tree(height, position) {
    const treeHeight = Math.random() * 1 + 1.25;
  
    const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
    
    const geo2 = new THREE.CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
    
    const geo3 = new THREE.CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);
  
    return mergeGeometries([geo, geo2, geo3]);
  }

// function to randomly generate clouds
function clouds() {
    let geo = new THREE.SphereGeometry(0, 0, 0); 
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);

    for(let i = 0; i < count; i++) {
        const puff1 = new THREE.SphereGeometry(1.2, 7, 7);
        const puff2 = new THREE.SphereGeometry(1.5, 7, 7);
        const puff3 = new THREE.SphereGeometry(0.9, 7, 7);
        
        puff1.translate(-1.85, Math.random() * 0.4, 0);
        puff2.translate(0,     Math.random() * 0.4, 0);
        puff3.translate(1.85,  Math.random() * 0.4, 0);

        const cloudGeo = mergeGeometries([puff1, puff2, puff3]);
        cloudGeo.translate( 
        Math.random() * 20 - 10, 
        Math.random() * 7 + 7, 
        Math.random() * 20 - 10
        );
        cloudGeo.rotateY(Math.random() * Math.PI * 2);

        geo = mergeGeometries([geo, cloudGeo]);
    }

    const MESH = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
        envMap: envmap, 
        envMapIntensity: 0.75, 
        flatShading: true,
        })
    );

    scene.add(MESH);
}