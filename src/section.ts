import * as T from 'three';

/** Editorial sectioning, never a mechanical disassembly simulation. */
export function opens(object: T.Object3D, offset: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  object.userData.opening = {
    position: object.position.clone(), quaternion: object.quaternion.clone(),
    offset: new T.Vector3(...offset), turn: new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
  };
  return object;
}

export function openSection(root: T.Object3D, amount: number) {
  root.userData.openAmount = amount;
  root.traverse((o) => {
    const p = o.userData.opening;
    if (!p) return;
    o.position.copy(p.position).addScaledVector(p.offset, amount);
    o.quaternion.copy(p.quaternion).multiply(new T.Quaternion().slerp(p.turn, amount));
  });
  root.updateMatrixWorld(true);
}

/** Includes the instance transform, so a picked rod stays the camera's destination. */
export function pickedSphere(object: T.Object3D, instanceId?: number) {
  object.updateWorldMatrix(true, true);
  if (object instanceof T.InstancedMesh && instanceId !== undefined) {
    object.geometry.computeBoundingBox();
    const transform = new T.Matrix4();
    object.getMatrixAt(instanceId, transform);
    transform.premultiply(object.matrixWorld);
    return object.geometry.boundingBox!.clone().applyMatrix4(transform).getBoundingSphere(new T.Sphere());
  }
  return new T.Box3().setFromObject(object).getBoundingSphere(new T.Sphere());
}
