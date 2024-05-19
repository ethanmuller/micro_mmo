import { BufferGeometry } from "three";
import { Float32BufferAttribute } from 'three';
import { Vector3 } from 'three';
import { Vector2 } from 'three';


class MouseholeGeometry extends BufferGeometry {

	constructor( width = 1, height = 1, holeWidth = 0.5, holeHeight = 0.8, archDivisions = 8) {

		super();

		this.type = 'MouseholeGeometry';

		this.parameters = {
			width: width,
			height: height,
			holeWidth: holeWidth,
			holeHeight: holeHeight,
            archDivisions: archDivisions,
		};

        archDivisions = Math.max(0, archDivisions);

		const scope = this;

		// buffers

		const indices = [];
		const vertices = [];
		const normals = [];
		const uvs = [];

		// helper variables

        const holeCurvatureStartHeight = Math.max(0, holeHeight - holeWidth * 0.5);
        const curveHeight = holeHeight - holeCurvatureStartHeight;
        const holeDepth = width * 0.9;

        let groupStart = 0;
        let groupCount = 0;
        // material
        const outsideWallMaterialIndex = 0;
        const floorMaterialIndex = 1;
        const roofMaterialIndex = 2;
        const insideWallMaterialIndex = 3;

		// generate geometry

		const frontNormal = new Vector3(0,0,1);
        const backNormal = new Vector3(0,0,-1);
        const leftNormal = new Vector3(1,0,0);
        const rightNormal = new Vector3(-1,0,0);
        const upNormal = new Vector3(0,1,0);
        const downNormal = new Vector3(0,-1,0);
        
        let vCount = 0;

        const halfWidth = width * 0.5;

        let addVertex = function(x,y, z = halfWidth, n = frontNormal, uv = "xy") {
            vertices.push(x, y, z);
            normals.push(n.x, n.y, n.z);
            if (uv == "xy")
                uvs.push((x+halfWidth)/width, y/height);
            else if (uv == "-xy")
                uvs.push(1 - (x+halfWidth)/width, y/height);
            else if (uv == "zy")
                uvs.push((z+halfWidth)/width, y/height);
            else if (uv == "-zy")
                uvs.push(1 - (z+halfWidth)/width, y/height);
            else if (uv == "xz")
                uvs.push((x+halfWidth)/width, (z+halfWidth)/width);
            else if (uv == "x-z")
                uvs.push((x+halfWidth)/width, 1 - (z+halfWidth)/width);

            return vCount++;
        }
        
        let leftBottom = addVertex(-halfWidth, 0);
        let leftTop = addVertex(-halfWidth, height);
        let rightTop = addVertex(halfWidth, height);
        let rightBottom = addVertex(halfWidth, 0);
        let leftHoleBottom = addVertex(-holeWidth * 0.5, holeCurvatureStartHeight);
        let rightHoleBottom = addVertex(holeWidth * 0.5, holeCurvatureStartHeight);
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

        // outside walls
        // let's do all of them for now
        // also, we have to "duplicate" vertices to assign different normals (per vertex)
        leftBottom = addVertex(-halfWidth, 0, halfWidth, leftNormal, "-zy");
        leftTop = addVertex(-halfWidth, height, halfWidth, leftNormal, "-zy");
        let blt = addVertex(-halfWidth, height, -halfWidth, rightNormal, "-zy");
        let blb = addVertex(-halfWidth, 0, -halfWidth, leftNormal, "-zy");
        indices.push(leftBottom, leftTop, blb);
        indices.push(leftTop, blt, blb);

        
        rightTop = addVertex(halfWidth, height, halfWidth, rightNormal, "zy");
        rightBottom = addVertex(halfWidth, 0, halfWidth, rightNormal, "zy");
        let brb = addVertex(halfWidth, 0, -halfWidth, leftNormal, "zy");
        let brt = addVertex(halfWidth, height, -halfWidth, rightNormal, "zy");
        indices.push(rightBottom, brb, rightTop);
        indices.push(rightTop, brb, brt);

        
        blb = addVertex(-halfWidth, 0, -halfWidth, backNormal, "-xy");
        brb = addVertex(halfWidth, 0, -halfWidth, backNormal, "-xy");
        blt = addVertex(-halfWidth, height, -halfWidth, backNormal, "-xy");
        brt = addVertex(halfWidth, height, -halfWidth, backNormal, "-xy");
        indices.push(blb, brt, brb);
        indices.push(blb, blt, brt);
        
        groupCount += indices.length;
        this.addGroup(groupStart, groupCount, outsideWallMaterialIndex);
        groupStart += groupCount;
        groupCount = 0;
        // Outside walls group ends here

        // floor
        leftBottom = addVertex(-halfWidth, 0, halfWidth, upNormal, "xz");
        rightBottom = addVertex(halfWidth, 0, halfWidth, upNormal, "xz");
        blb = addVertex(-halfWidth, 0, -halfWidth, upNormal, "xz");
        brb = addVertex(halfWidth, 0, -halfWidth, upNormal, "xz");
        indices.push(leftBottom, rightBottom, brb);
        indices.push(leftBottom, brb, blb);
        groupCount += 6;
        this.addGroup(groupStart, groupCount, floorMaterialIndex);
        groupStart += groupCount;
        groupCount = 0;
        // roof
        leftTop = addVertex(-halfWidth, height, halfWidth, upNormal, "xz");
        rightTop = addVertex(halfWidth, height, halfWidth, upNormal, "xz");
        blt = addVertex(-halfWidth, height, -halfWidth, upNormal, "xz");
        brt = addVertex(halfWidth, height, -halfWidth, upNormal, "xz");
        indices.push(leftTop, rightTop, brt);
        indices.push(leftTop, brt, blt);
        groupCount += 6;
        this.addGroup(groupStart, groupCount, roofMaterialIndex);
        groupStart += groupCount;
        groupCount = 0;

        // inside walls
        let holeLeftFloorFront = addVertex(-holeWidth * 0.5, 0, halfWidth, rightNormal, "zy");
        let holeLeftTopFront = addVertex(-holeWidth * 0.5, holeHeight, halfWidth, rightNormal, "zy");
        let holeLeftFloorBack = addVertex(-holeWidth * 0.5, 0, halfWidth - holeDepth, rightNormal, "zy");
        let holeLeftTopBack = addVertex(-holeWidth * 0.5, holeHeight, halfWidth - holeDepth, rightNormal, "zy");
        indices.push(holeLeftFloorFront, holeLeftFloorBack, holeLeftTopFront);
        indices.push(holeLeftTopFront, holeLeftFloorBack, holeLeftTopBack);
        groupCount += 6;

        let holeRightFloorFront = addVertex(holeWidth * 0.5, 0, halfWidth, leftNormal, "-zy");
        let holeRightTopFront = addVertex(holeWidth * 0.5, holeHeight, halfWidth, leftNormal, "-zy");
        let holeRightFloorBack = addVertex(holeWidth * 0.5, 0, halfWidth - holeDepth, leftNormal, "-zy");
        let holeRightTopBack = addVertex(holeWidth * 0.5, holeHeight, halfWidth - holeDepth, leftNormal, "-zy");
        indices.push(holeRightFloorFront, holeRightTopFront, holeRightFloorBack);
        indices.push(holeRightTopFront, holeRightTopBack, holeRightFloorBack);
        groupCount += 6;

        holeRightFloorBack = addVertex(holeWidth * 0.5, 0, halfWidth - holeDepth, frontNormal, "xy");
        holeRightTopBack = addVertex(holeWidth * 0.5, holeHeight, halfWidth - holeDepth, frontNormal, "xy");
        holeLeftFloorBack = addVertex(-holeWidth * 0.5, 0, halfWidth - holeDepth, frontNormal, "xy");
        holeLeftTopBack = addVertex(-holeWidth * 0.5, holeHeight, halfWidth - holeDepth, frontNormal, "xy");
        indices.push(holeRightFloorBack, holeRightTopBack, holeLeftFloorBack);
        indices.push(holeLeftFloorBack, holeRightTopBack, holeLeftTopBack);
        groupCount += 6;
        
        holeRightTopBack = addVertex(holeWidth * 0.5, holeHeight, halfWidth - holeDepth, downNormal, "x-z");
        holeLeftTopBack = addVertex(-holeWidth * 0.5, holeHeight, halfWidth - holeDepth, downNormal, "x-z");
        holeLeftTopFront = addVertex(-holeWidth * 0.5, holeHeight, halfWidth, downNormal, "x-z");
        holeRightTopFront = addVertex(holeWidth * 0.5, holeHeight, halfWidth, downNormal, "x-z");
        indices.push(holeRightTopBack, holeLeftTopFront, holeLeftTopBack);
        indices.push(holeLeftTopFront, holeRightTopBack, holeRightTopFront);
        groupCount += 6;

        
        this.addGroup(groupStart, groupCount, insideWallMaterialIndex);
        groupStart += groupCount;
        groupCount = 0;


		// build geometry

		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );
	}

	static fromJSON( data ) {

		return new MouseholeGeometry( data.radius, data.height, data.holeWidth, data.holeHeight, data.archDivisions);

	}

}

export { MouseholeGeometry };
