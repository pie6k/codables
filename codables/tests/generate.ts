const RANDOM_THINGS = [
  () => new Date(),
  () => new Set([1, 2, 3]),
  () => new Map([["foo", "bar"]]),
  () => new Set([new Date(), new Date(), new Date()]),
];

const REFERENCED_THINGS = [new Map([["ref", "ref"]])];

function getRandomThing(i: number) {
  if (i === 15) return REFERENCED_THINGS[0];

  return RANDOM_THINGS[i % RANDOM_THINGS.length]();
}

export function generateData() {
  const data = [];
  for (let i = 0; i < 100; i++) {
    let nested1 = [];
    let nested2 = [];
    for (let j = 0; j < 10; j++) {
      nested1[j] = {
        createdAt: getRandomThing(i + j),
        updatedAt: getRandomThing(i + j + 1),
        innerNested: {
          createdAt: getRandomThing(i + j + 2),
          updatedAt: getRandomThing(i + j + 3),
        },
      };
      nested2[j] = {
        createdAt: getRandomThing(i + j + 4),
        updatedAt: getRandomThing(i + j + 5),
        innerNested: {
          createdAt: getRandomThing(i + j + 6),
          updatedAt: getRandomThing(i + j + 7),
        },
      };
    }
    const object = {
      createdAt: getRandomThing(i + 8),
      updatedAt: getRandomThing(i + 9),
      nested1,
      nested2,
    };
    data.push(object);
  }
  return data;
}
