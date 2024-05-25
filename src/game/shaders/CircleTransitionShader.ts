/**
 * Full-screen textured quad shader
 */

import { Color, Uniform, Vector2 } from "three";

const CircleTransitionShader = {

	name: 'CircleTransitionShader',

	uniforms: {
        tDiffuse: { value: null },
        aspectRatio: { value: 1.0 },
        color: new Uniform(new Color(0,0,0)),
        colorOpacity: { value: 1.0 },
        fadeOut: { value: 0.0 },
        halfHeightRelativeRadius: { value: 1.0 },
	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float fadeOut;
		uniform float aspectRatio;
		uniform float halfHeightRelativeRadius;

        uniform vec3 color;
        uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
            vec2 normalizedUv = (vUv - vec2(0.5, 0.5));
            normalizedUv.x *= aspectRatio;

            if (length(normalizedUv)/halfHeightRelativeRadius < (1.0 - fadeOut))
                gl_FragColor = texel;
            else gl_FragColor = vec4(color, 1);
		}`

};

export { CircleTransitionShader };
