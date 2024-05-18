import { BufferGeometry } from "three";
import { Float32BufferAttribute } from 'three';
import { Vector3 } from 'three';
import { Vector2 } from 'three';


class MouseholeGeometry extends BufferGeometry {

	constructor( width = 1, height = 1, holeWidth = 0.5, holeRatio = 0.8, archDivisions = 8) {

		super();

		this.type = 'MouseholeGeometry';

		this.parameters = {
			width: width,
			height: height,
			holeWidth: holeWidth,
			holeRatio: holeRatio
		};

        archDivisions = Math.max(0, archDivisions);

		const scope = this;

		// buffers

		const indices = [];
		const vertices = [];
		const normals = [];
		const uvs = [];

		// helper variables

		let index = 0;
		const indexArray = [];
		const holeHeight = holeWidth / holeRatio;
        const holeCurvatureStartHeight = Math.max(0, holeHeight - holeWidth * 0.5);
        const curveHeight = holeHeight - holeCurvatureStartHeight;

		// generate geometry

		const normal = new Vector3(0,0,1);
        const vertex = new Vector3();
        let vCount = 0;

        const halfWidth = width * 0.5;

        let addVertex = function(x,y) {
            vertices.push(x, y, 0);
            normals.push(normal.x, normal.y, normal.z);
            uvs.push((x+halfWidth)/width, y/height);

            return vCount++;
        }
        
        const leftBottom = addVertex(-halfWidth, 0);
        const leftTop = addVertex(-halfWidth, height);
        const rightTop = addVertex(halfWidth, height);
        const rightBottom = addVertex(halfWidth, 0);
        const leftHoleBottom = addVertex(-holeWidth * 0.5, holeCurvatureStartHeight);
        const rightHoleBottom = addVertex(holeWidth * 0.5, holeCurvatureStartHeight);
        const holeTop = addVertex(0, holeHeight);

        indices.push(leftBottom, leftHoleBottom, leftTop);
        indices.push(rightHoleBottom, rightBottom, rightTop);
        indices.push(leftTop, holeTop, rightTop);

        if (holeCurvatureStartHeight > 0) {
            const leftHoleFloor = addVertex(-holeWidth * 0.5, 0);
            const rightHoleFloor = addVertex(holeWidth * 0.5, 0);

            indices.push(leftBottom, leftHoleFloor, leftHoleBottom);
            indices.push(rightHoleBottom, rightHoleFloor, rightBottom);
        }

        // arches
        let pendingArchClose = leftHoleBottom;
        let archDeltaAngle = Math.PI * 0.5 / (archDivisions + 1);
        // arch left
        for (let i = 1; i <= archDivisions; ++i) {
            let angle = archDeltaAngle * i;

            let x = -Math.cos(angle) * holeWidth * 0.5;
            let y = holeCurvatureStartHeight + Math.sin(angle) * curveHeight;
            let v = addVertex(x, y);

            indices.push(pendingArchClose, v, leftTop);
            pendingArchClose = v
        }
        indices.push(pendingArchClose, holeTop, leftTop);

        // arch right
        pendingArchClose = rightHoleBottom;
        for (let i = 1; i <= archDivisions; ++i) {
            let angle = archDeltaAngle * i;

            let x = Math.cos(angle) * holeWidth * 0.5;
            let y = holeCurvatureStartHeight + Math.sin(angle) * curveHeight;
            let v = addVertex(x, y);

            indices.push(pendingArchClose, rightTop, v);
            pendingArchClose = v
        }
        indices.push(pendingArchClose, rightTop, holeTop);

		// build geometry

		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );
	}

	static fromJSON( data ) {

		return new MouseholeGeometry( data.radius, data.height, data.radialSegments, data.heightSegments, data.slopePercent );

	}

}

export { MouseholeGeometry };
