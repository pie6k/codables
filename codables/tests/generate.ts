const RANDOM_THINGS = [
  () => new Date(),
  () => new Set([1, 2, 3]),
  () => new Map([["foo", "bar"]]),
  () => new Set([new Date(), new Date(), new Date()]),
  () => [new Set([1, 2, 3])],
];

const REFERENCED_THINGS = [new Map([["ref", "ref"]])];

function getRandomThing(i: number, sameReferences: boolean) {
  if (i === 15 && sameReferences) return REFERENCED_THINGS[0];

  return RANDOM_THINGS[i % RANDOM_THINGS.length]();
}

export interface GenerateDataOptions {
  sameReferences?: boolean;
  i?: number;
  j?: number;
}

export function generateData(options: GenerateDataOptions = {}) {
  const { sameReferences = false, i: iMax = 500, j: jMax = 50 } = options;

  const data = [];
  for (let i = 0; i < iMax; i++) {
    let nested1 = [];
    let nested2 = [];
    for (let j = 0; j < jMax; j++) {
      nested1[j] = {
        createdAt: getRandomThing(i + j, sameReferences),
        updatedAt: getRandomThing(i + j + 1, sameReferences),
        innerNested: {
          createdAt: getRandomThing(i + j + 2, sameReferences),
          updatedAt: getRandomThing(i + j + 3, sameReferences),
        },
      };
      nested2[j] = {
        createdAt: getRandomThing(i + j + 4, sameReferences),
        updatedAt: getRandomThing(i + j + 5, sameReferences),
        innerNested: {
          createdAt: getRandomThing(i + j + 6, sameReferences),
          updatedAt: getRandomThing(i + j + 7, sameReferences),
        },
      };
    }
    const object = {
      createdAt: getRandomThing(i + 8, sameReferences),
      updatedAt: getRandomThing(i + 9, sameReferences),
      nested1,
      nested2,
    };
    data.push(object);
  }
  return data;
}
