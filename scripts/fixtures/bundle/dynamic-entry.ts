// A bundle-assertion fixture: `three` reached only through a dynamic import, the split AD-7 protects.
void import('three').then(({ Vector3 }) => console.log(new Vector3(1, 2, 2).length()));
