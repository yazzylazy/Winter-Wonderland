import Ammo from "ammojs3";
import {tmpTransformation} from "./main.js";

// AMMO JS VARIABLES
var physicsUniverse = undefined;
var rigidBody_List = new Array(); // array of rigidbodies
const ammo = await new Ammo();

// function made to initialize our dynamic universe
export function initPhysicsUniverse()
{
    var collisionConfiguration  = new ammo.btDefaultCollisionConfiguration();
    var dispatcher              = new ammo.btCollisionDispatcher(collisionConfiguration);
    var overlappingPairCache    = new ammo.btDbvtBroadphase();
    var solver                  = new ammo.btSequentialImpulseConstraintSolver();
    physicsUniverse             = new ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsUniverse.setGravity(new ammo.btVector3(0, -75, 0));
}

export function updatePhysicsUniverse( deltaTime )
{
    physicsUniverse.stepSimulation( deltaTime, 10 );
    //console.log(rigidBody_List);
    for ( let i = 0; i < rigidBody_List.length; i++ ){
        let Graphics_Obj = rigidBody_List[ i ];
        //console.log(Graphics_Obj);
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

// take a three.js mesh and convert it into a a physical object using ammo.js
export function convertToPhysics(object, position, mass, rot_quaternion,sphere,radius,height)
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


    // ------ Physics Universe - ammo.js ------
    let transform = new ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new ammo.btVector3( position.x, position.y, position.z ) );
    transform.setRotation( new ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );
    let defaultMotionState = new ammo.btDefaultMotionState( transform );

    let structColShape;
 
    // geometric structure of collision of our object
    if(sphere){
        structColShape = new ammo.btSphereShape( radius  );
        structColShape.setMargin( 0.05 );
    }
    else{
        structColShape = new ammo.btCylinderShape( new ammo.btVector3( radius, height * 0.5, radius ) );
        structColShape.setMargin( 0.05 );
    }
    

    // initial inertia
    let localInertia = new ammo.btVector3( 0, 0, 0 );
    structColShape.calculateLocalInertia( mass, localInertia );

    //create our rigid body
    let RBody_Info = new ammo.btRigidBodyConstructionInfo( mass, defaultMotionState, structColShape, localInertia );
    let RBody = new ammo.btRigidBody( RBody_Info );

    // add to our physics universe
    physicsUniverse.addRigidBody( RBody );
    // define the cube as userData.physicsBody
    object.userData.physicsBody = RBody;
    // add cube to the list
    rigidBody_List.push(object);
}