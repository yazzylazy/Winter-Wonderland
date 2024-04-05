varying vec3 LightDir;
varying vec3 EyeDir; 
varying vec4 texCoord;

// Added by Three.js
// uniform mat4 modelViewMatrix; 
// uniform mat4 projectionMatrix;
// uniform mat4 normalMatrix;

struct PointLight {
  vec3 color;
  vec3 position; // light position, in camera coordinates
};

uniform PointLight pointLights[NUM_POINT_LIGHTS];

void main() {
  EyeDir = vec3(modelViewMatrix * vec4(position,1.0));
  gl_Position = projectionMatrix * vec4(EyeDir,1.0);
  texCoord = vec4(uv.x, uv.y, 0, 1.0);
  vec3 NN = normalize(normalMatrix * normal); // Local coordinates
  // Will not work - needs fix
   // Will not work - needs fix
  vec3 TN = normalize(cross(NN, vec3(1.0, 1.0, 1.0)));
  vec3 BN = cross(NN, TN);
  vec3 v;
  v.x = dot(pointLights[0].position, TN); v.y = dot(pointLights[0].position, BN);
  v.z = dot(pointLights[0].position, NN);
  LightDir = normalize(v); // Light dir in local coordinates
  v.x = dot(EyeDir, TN); v.y = dot(EyeDir, BN);
  v.z = dot(EyeDir, NN);
  EyeDir = normalize(v); // Eye dir in local coordinates
}