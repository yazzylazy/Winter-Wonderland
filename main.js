import * as THREE from "three";
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FBXLoader } from 'https://unpkg.com/three@latest/examples/jsm/loaders/FBXLoader.js';
import { GUI } from "dat.gui";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';
import Ammo from "ammojs3";

// AMMO JS VARIABLES
var physicsUniverse = undefined;
var rigidBody_List = new Array(); // array of rigidbodies
var tmpTransformation = undefined; // temporarily stores transformation
const ammo = await new Ammo()

// Snowflake variables
let particles; // snow flake
let positions = [], velocities = []; // snow flake position (x,y,z) and flake velocity (x,y,z)

const numberSnowFlakes = 500; // number of snowFlakes

const maxRange = 400, minRange = maxRange/2; // flakes are places from -200 to 200 on x and z axis
const minHeight = -50; // flakes are places from -50 to 50 on y axis


const snowFlakeGeo = new THREE.BufferGeometry(); // stores our snow flake geomerty

// initalize environment mapping variable
let envmap;

// initialize scene
let scene;
// initialize clock
let clock;
// initialize renderer
let renderer;
// initialize camera
let camera;

// constant for height of mountains
const MAX_HEIGHT = 10;
const SNOW_HEIGHT = MAX_HEIGHT * 0.8;
const snowSTONE_HEIGHT = MAX_HEIGHT * 0.7;
const SNOW2_HEIGHT = MAX_HEIGHT * 0.5;
const ICE_HEIGHT = MAX_HEIGHT * 0.3;
const mossSNOW_HEIGHT = MAX_HEIGHT * 0.0;


function initGraphicsUniverse() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#d6d1ff");

    camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(0,500,500);

    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    // make values computed by render properly display on monitor
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    // enabling shadows in the renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    var ambientLight = new THREE.AmbientLight(0xcccccc, 1);
    scene.add(ambientLight);

    // adding a point light
    const light = new THREE.PointLight( new THREE.Color("#fffeed").convertSRGBToLinear().convertSRGBToLinear(),200,300); // convert color of the light so renderer understands
    //light.position.set(100,200,100);
    light.position.set(-1, 0.9, 0.4);

    // make sure the light can cast shadows
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;

    // add the light to our scene
    scene.add(light);

    // set orbit controls to always look at origin
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0,0,0);
    controls.dampingFactor = 0.05;
    controls.enableDamping = true;
}


// function made to initialize our dynamic universe
function initPhysicsUniverse()
{
    var collisionConfiguration  = new ammo.btDefaultCollisionConfiguration();
    var dispatcher              = new ammo.btCollisionDispatcher(collisionConfiguration);
    var overlappingPairCache    = new ammo.btDbvtBroadphase();
    var solver                  = new ammo.btSequentialImpulseConstraintSolver();
    physicsUniverse               = new ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsUniverse.setGravity(new ammo.btVector3(0, -75, 0));
}

function updatePhysicsUniverse( deltaTime )
{
    physicsUniverse.stepSimulation( deltaTime, 10 );
    for ( let i = 0; i < rigidBody_List.length; i++ ){
        let Graphics_Obj = rigidBody_List[ i ];
        let Physics_Obj = Graphics_Obj.userData.physicsBody;

        var tmpTransformation     = undefined;
        tmpTransformation = new ammo.btTransform();

        let motionState = Physics_Obj.getMotionState();
        if ( motionState ){
            motionState.getWorldTransform( tmpTransformation );
            let new_pos = tmpTransformation.getOrigin();
            let new_qua = tmpTransformation.getRotation();
            Graphics_Obj.position.set( new_pos.x(), new_pos.y(), new_pos.z() );
            Graphics_Obj.quaternion.set( new_qua.x(), new_qua.y(), new_qua.z(), new_qua.w() );
        }
    } 
}

function createCube(scale , position, mass, rot_quaternion)
{
    let quaternion = undefined;
    if(rot_quaternion == null)
    {
        quaternion = {x: 0, y: 0, z: 0, w:  1};
    }
    else
    {
      quaternion = rot_quaternion;
    }
    // ------ Graphics Universe - Three.JS ------
    let newcube = new THREE.Mesh(new THREE.BoxGeometry(scale, scale, scale), new THREE.MeshPhongMaterial({color: Math.random() * 0xffffff}));
    newcube.position.set(position.x, position.y, position.z);
    scene.add(newcube);

    // ------ Physics Universe - ammo.js ------
    let transform = new ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new ammo.btVector3( position.x, position.y, position.z ) );
    transform.setRotation( new ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );
    let defaultMotionState = new ammo.btDefaultMotionState( transform );

    // geometric structure of collision of our object
    let structColShape = new ammo.btBoxShape( new ammo.btVector3( scale*0.5, scale*0.5, scale*0.5 ) );
    structColShape.setMargin( 0.05 );

    // initial inertia
    let localInertia = new ammo.btVector3( 0, 0, 0 );
    structColShape.calculateLocalInertia( mass, localInertia );

    //create our rigid body
    let RBody_Info = new ammo.btRigidBodyConstructionInfo( mass, defaultMotionState, structColShape, localInertia );
    let RBody = new ammo.btRigidBody( RBody_Info );

    // add to our physics universe
    physicsUniverse.addRigidBody( RBody );
    // define the cube as userData.physicsBody
    newcube.userData.physicsBody = RBody;
    // add cube to the list
    rigidBody_List.push(newcube);
}


// entry point
function AmmoStart()
{   
    tmpTransformation = new ammo.btTransform();
    initPhysicsUniverse();
    initGraphicsUniverse();
    // base
    createCube(40 , new THREE.Vector3(10, -30, 10) , 0 );
    // falling cubes
    createCube(4 , new THREE.Vector3(0, 10, 0) , 1, null );
    createCube(2 , new THREE.Vector3(10, 30, 0) , 1, null );
    createCube(4 , new THREE.Vector3(10, 20, 10) , 1, null );
    createCube(6 , new THREE.Vector3(5, 40, 20) , 1, null );
    createCube(8 , new THREE.Vector3(25, 100, 5) , 1, null );
    createCube(8 , new THREE.Vector3(20, 60, 25) , 1, null );
    createCube(4 , new THREE.Vector3(20, 100, 25) , 1, null );
    createCube(2 , new THREE.Vector3(20, 200, 25) , 1, null );

    render();
}

Ammo().then(AmmoStart);

function render()
{
        let deltaTime = clock.getDelta();
        updatePhysicsUniverse( deltaTime );
                
        renderer.render( scene, camera );
        requestAnimationFrame( render );
}


// animation loop
// (async function(){
//     // process the environment app to use in our materials
//     let prem = new THREE.PMREMGenerator(renderer);
//     let envmapTexture = await new RGBELoader().setDataType(THREE.FloatType).loadAsync("assets/snowy_hillside_4k.hdr");
//     envmap = prem.fromEquirectangular(envmapTexture).texture;

//     let textures = {
//         snow2: await new THREE.TextureLoader().loadAsync("assets/snow2.jpg"),
//         snow: await new THREE.TextureLoader().loadAsync("assets/snow.jpg"),
//         mossSnow: await new THREE.TextureLoader().loadAsync("assets/mossSnow.jpg"),
//         ice: await new THREE.TextureLoader().loadAsync("assets/ice.jpg"),
//         SnowStone: await new THREE.TextureLoader().loadAsync("assets/snowStone.jpg"),
//         container: await new THREE.TextureLoader().loadAsync("assets/houseFloor.jpg"),
//         wood: await new THREE.TextureLoader().loadAsync("assets/wood.jpg"),
//         glass: await new THREE.TextureLoader().loadAsync("assets/glass.jpg"),
//         snowFlake: await new THREE.TextureLoader().loadAsync("images/snowflake2.jpg")
//       };
    
//     const simplex = new SimplexNoise(); // optional seed as a string parameter

//     // creating map of hexagons
//     for(let i=-10; i<=10; i++){
//         for(let j=-10; j<=10; j++){
            
//             let position = titleToPosition(i,j);

//             // if the radius of heaxgon outside of circle radius of size 16, we skip it
//             if(position.length()>16) continue;

//             // +1 * 0.5 is a normalization factor we add to keep the noise between [0,1]
//             let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
//             // makes mountains a little steeper
//             noise = Math.pow(noise, 1.5);

//             makeHex(noise * MAX_HEIGHT, position, envmap);
//         }
//     }

//     // create a new hexagon geomtry with added environment material mapping depending on each type of hexagon
    
//     let stoneMesh = hexMesh(stoneGeo,textures.SnowStone);
//     let iceMesh = hexMesh(iceGeo,textures.ice);
//     let snowMesh = hexMesh(snowGeo,textures.snow);
//     let snow2Mesh = hexMesh(snow2Geo,textures.snow2);
//     let snowMossMesh = hexMesh(mossGeo,textures.mossSnow);
    
//     scene.add(stoneMesh,iceMesh,snowMesh,snow2Mesh,snowMossMesh);


//     // create a snowy transperent mesh encapuslating all bottom hexagons
//     let snowFloorMesh = new THREE.Mesh(
//         new THREE.CylinderGeometry(17, 17, MAX_HEIGHT * 0.13, 50),
//         new THREE.MeshPhysicalMaterial({
//           envMap: envmap,
//           color: new THREE.Color("#f5fcfb").convertSRGBToLinear().multiplyScalar(3),
//           ior: 1.3,
//           transmission: 1,
//           transparent: true,
//           thickness: 0.5,
//           envMapIntensity: 0.2, 
//           roughness: 1,
//           metalness: 0.025,
//           roughnessMap: textures.snow,
//           metalnessMap: textures.snow,
//         })
//       );
//     snowFloorMesh.receiveShadow = true;
//     snowFloorMesh.rotation.y = -Math.PI * 0.333 * 0.5;
//     snowFloorMesh.position.set(0, MAX_HEIGHT * 0.0, 0);
    

//     //add another cylinder for walls around our other meshes
//     let mapContainer =new  THREE.Mesh(
//         new  THREE.CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
//         new  THREE.MeshPhysicalMaterial({
//             envMap: envmap,
//             map: textures.container,
//             envMapIntensity: 0.2, 
//             side: THREE.DoubleSide, // render both sides
//         })
//       );
//     mapContainer.receiveShadow = true;
//     mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
//     mapContainer.position.set(0, MAX_HEIGHT * 0.0, 0);

//     // add a cylinder for the floor around the entire mesh
//     let mapFloor = new THREE.Mesh(
//         new  THREE.CylinderGeometry(21, 18.5, MAX_HEIGHT * 0.1, 50),
//         new  THREE.MeshPhysicalMaterial({
//             envMap: envmap,
//             map: textures.wood,
//             envMapIntensity: 0.1, 
//             side:  THREE.DoubleSide,
//         })
//       );
//     mapFloor.receiveShadow = true;
//     mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
    
//     // and random clouds
//     clouds();

//     // 2 penguins
//     //penguins();
//     //loaderTwo();

//     addSnowflakes(textures);

//      // create a snowy transperent mesh encapuslating all bottom hexagons
//     let Globe = new THREE.Mesh(
//         new THREE.SphereGeometry(21, 50, 50,0,Math.PI * 2,0,1.57),
//         new THREE.MeshPhysicalMaterial({
//             metalness: 0,
//             roughness: 0,
//             transmission: 1,
//             ior: 1.7,
//             clearcoat: 1.0,
//             thickness: 0.5,
//             transparent: true,
//             opacity: 0.3
//         })
//     );
//     Globe.receiveShadow = true;

//     const group = new THREE.Group();
//     group.add(Globe);
//     group.add(mapFloor);
//     group.add(mapContainer);
//     group.add(snowFloorMesh);
//     group.add(stoneMesh,iceMesh,snowMesh,snow2Mesh,snowMossMesh);
//     group.scale.setScalar(10);
//     //scene.add(group);

//     Ammo().then(AmmoStart);

//     renderer.setAnimationLoop(() => {
//         let deltaTime = clock.getDelta();
//         updatePhysicsUniverse( deltaTime );
//         updateSnowFlakes();
//         controls.update();
//         renderer.render(scene,camera);
//     });
// })();

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

function updateSnowFlakes(){
    // each snow flake has positions (x,y,z) that we itterate over and adjust
    for (let i=0; i< numberSnowFlakes*3; i+=3){
        // add veloctiy to position of each snow flake
        particles.geometry.attributes.position.array[i] -=  particles.geometry.attributes.velocity.array[i]; // change x position by x velocity
        particles.geometry.attributes.position.array[i+1] -=  particles.geometry.attributes.velocity.array[i+1]; // change y position by y velocity
        particles.geometry.attributes.position.array[i+2] -=  particles.geometry.attributes.velocity.array[i+2]; // change z position by z velocity

        //checks to see if flake is below grade and resets its position
        if(particles.geometry.attributes.position.array[i+1] < 0){
            particles.geometry.attributes.position.array[i] = Math.floor(Math.random()*maxRange - minRange);
            particles.geometry.attributes.position.array[i+1] = Math.floor(Math.random()* minRange + minHeight);
            particles.geometry.attributes.position.array[i+2] = Math.floor(Math.random()*maxRange - minRange);
        }
    }
    // set below to true in order to update position array of particles
    particles.geometry.attributes.position.needsUpdate = true;
}

function addSnowflakes(textures){

    // create the snow flake geometry
    for(let i=0;i<numberSnowFlakes;i++){
        positions.push(
            Math.floor(Math.random() *maxRange - minRange), // x between max range and min range
            Math.floor(Math.random() *maxRange + minHeight), // y between min range and min height
            Math.floor(Math.random() *maxRange - minRange), // y between max range and min range
        );
        velocities.push(
            Math.floor(Math.random()*6 - 3) * 0.1, 
            Math.floor(Math.random()*5 + 0.12) * 0.18, 
            Math.floor(Math.random()*6 - 3) * 0.1, 
        )
    }

    // set attributes of position and velocity in its geometry
    snowFlakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    snowFlakeGeo.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities,3));

    // create material for snowflake
    const snowFlakeMaterial = new THREE.PointsMaterial({
        size: 4,
        map: textures.snowFlake,
        blending: THREE.AdditiveBlending,
        depthTest: false, // we dont need to know if objects snowflakes overlap
        transparent: true,
        opacity: 0.7
    });

    particles = new THREE.Points(snowFlakeGeo,snowFlakeMaterial);
    scene.add(particles);
}

// make penguin
function penguin(height, position) {
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;
    const penguin = new THREE.Group();

    // body
    const points = [];
    for (let i = 0; i < 10; i++) {
    points.push(new THREE.Vector2(Math.sin(i * 0.2) * 0.7 + 0.1, (i - 5) * 0.2));
    }
    const bodyGeometry = new THREE.LatheGeometry(points);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI;
    body.name = "body";
    penguin.add(body);

    // stomach
    const stomachGeometry = new THREE.SphereGeometry(1,32,32);
    const scaleX = 0.7; 
    const scaleY = 1;   
    const scaleZ = 0.5;
    stomachGeometry.scale(scaleX, scaleY, scaleZ);
    const stomachMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const stomach = new THREE.Mesh(stomachGeometry, stomachMaterial);
    stomach.name = "stomach";
    penguin.add(stomach);


    // head
    const headGeometry = new THREE.DodecahedronGeometry(0.45, 1);
    const headMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.3, 0);
    head.name = "head";

    // face
    const faceGeometry = new THREE.DodecahedronGeometry(0.22, 32); 
    const faceMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(0.3, 0, 0);
    face.rotation.y = Math.PI / 2;
    head.add(face); 
    penguin.add(head);

    // eyes
    const eyeOneGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeOneMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const eyeOne = new THREE.Mesh(eyeOneGeometry, eyeOneMaterial);
    eyeOne.position.set(0.3, 1.4, 0.2);
    eyeOne.name = "eyeOne";
    penguin.add(eyeOne);
    const eyeTwoGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeTwoMaterial = new THREE.MeshBasicMaterial({ color: "white" });
    const eyeTwo = new THREE.Mesh(eyeTwoGeometry, eyeTwoMaterial);
    eyeTwo.position.set(0.3, 1.4, -0.2);
    eyeTwo.name = "eyeTwo";
    penguin.add(eyeTwo);

    // pupils
    const eyeLeftGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeLeftMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const eyeLeft = new THREE.Mesh(eyeLeftGeometry, eyeLeftMaterial);
    eyeLeft.position.set(0.5, 1.45, 0.2);
    eyeLeft.name = "eyeLeft";
    penguin.add(eyeLeft);
    const eyeRightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeRightMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const eyeRight = new THREE.Mesh(eyeRightGeometry, eyeRightMaterial);
    eyeRight.position.set(0.5, 1.45, -0.2);
    eyeRight.name = "eyeRight";
    penguin.add(eyeRight);

    // beak
    const beakGeometry = new THREE.ConeGeometry(0.07, 0.17, 8);
    const beakMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.5, 1.3, 0);
    beak.rotation.x = Math.PI;
    beak.name = "beak";
    penguin.add(beak);

    // wings
    const leftWingGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const leftWingMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const leftWing = new THREE.Mesh(leftWingGeometry, leftWingMaterial);
    leftWing.position.set(0, 0.1, 0.65); 
    leftWing.rotation.z = -Math.PI / 2; 
    leftWing.rotation.x = -4; 
    leftWing.name = "leftEar";
    penguin.add(leftWing);
    const rightWingGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const rightWingMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    const rightWing = new THREE.Mesh(rightWingGeometry, rightWingMaterial);
    rightWing.position.set(0, 0.1, -0.65); 
    rightWing.rotation.z = Math.PI / 2; 
    rightWing.rotation.x = 4;
    rightWing.name = "rightEar";
    penguin.add(rightWing);

    // legs
    const leftLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const leftLegMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
    const leftLeg = new THREE.Mesh(leftLegGeometry, leftLegMaterial);
    leftLeg.position.set(0.6, -0.9, 0.3);
    leftLeg.rotation.z = Math.PI / 2;
    leftLeg.name = "frontLeg";
    penguin.add(leftLeg);
    const rightLegGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const rightLegMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
    const rightLeg = new THREE.Mesh(rightLegGeometry, rightLegMaterial);
    rightLeg.position.set(0.6, -0.9, -0.3);
    rightLeg.rotation.z = Math.PI / 2;
    rightLeg.name = "rearLeg";
    penguin.add(rightLeg);

    penguin.translate(position.x + px, height, position.y + pz)

    return penguin;
}

// generate 3 penguins
function penguins(){
    let penguin1 = penguin();
    penguin1.position.set(Math.random() * 20 - 10, 
    Math.random() * 7 + 7, 
    Math.random() * 20 - 10); 
    scene.add(penguin1);

    let penguin2 = penguin();
    penguin2.position.set(Math.random() * 20 - 10, 
    Math.random() * 7 + 7, 
    Math.random() * 20 - 10); 
    scene.add(penguin2);
}

function loaderTwo(){
    const loader = new FBXLoader();
    loader.load( 'assets/Shoved Reaction With Spin.fbx', function ( object ) {
        //object.scale.setScalar(0.2);
        // mixer = new THREE.AnimationMixer( object );
        // const action = mixer.clipAction( object.animations[ 0 ] );
        // action.play();
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );

        object.scale.set(0.5, 0.5, 0.5);
        const mixer = new THREE.AnimationMixer(object);
        if(object.animations.length > 0) {
            const action = mixer.clipAction(object.animations[0]);
            action.play();
        }

        scene.add( object );
    });
}
