let rootTest;
try {
  rootTest = self; // dom or web worker
  if (
    rootTest.self !== rootTest &&
    typeof rootTest.self !== 'undefined' &&
    typeof window !== 'undefined'
  ) {
    // Accidentally assigning `self` is a thing that websites do. But most of
    // these accidental assigns won't have a self property pointing at themselves.
    rootTest = window;
  }
} catch (err) {
  if (typeof globalThis !== 'undefined') {
    rootTest = globalThis; // es native in the future
  } else {
    // oh god, what's even happening
    rootTest = window;
  }
}

export const root = rootTest;
