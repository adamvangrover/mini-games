export default class Effects {
    constructor(scene) {
        this.scene = scene;

        // Aurora
        const auroraGeo = new THREE.PlaneGeometry(400,100,32,1);
        const auroraMat = new THREE.ShaderMaterial({
            uniforms:{
                time:{value:0}
            },
            vertexShader:`
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader:`
                uniform float time;
                varying vec2 vUv;
                void main() {
                    float brightness = sin(vUv.x*10.0 + time*0.5) * 0.5 + 0.5;
                    vec3 color = mix(vec3(0.0,0.1,0.5), vec3(0.0,1.0,0.5), brightness);
                    float alpha = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
                    gl_FragColor = vec4(color, alpha * 0.6);
                }
            `,
            transparent:true,
            side:THREE.DoubleSide,
            blending:THREE.AdditiveBlending,
            depthWrite: false
        });
        this.aurora = new THREE.Mesh(auroraGeo, auroraMat);
        this.aurora.position.set(0,150,-200);
        this.aurora.rotation.x = 0.2;
        scene.add(this.aurora);
    }

    update(dt) {
        // Aurora animation
        if (this.aurora) {
            this.aurora.material.uniforms.time.value += dt;
        }
    }
}
