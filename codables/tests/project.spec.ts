import { Coder } from "../Coder";
import { codableType } from "../CodableType";
import { codable } from "../decorators/codable";
import { codableClass } from "../decorators/codableClass";
import { observable, isObservableSet, autorun, action, isObservableMap, computed } from "mobx";
import { combineDecorators } from "../decorators/utils";

const $$observableSet = codableType(
  "_Set",
  (value) => isObservableSet(value),
  (set) => [...set],
  (items) => observable.set(items),
);

const $$observableMap = codableType(
  "_Map",
  (value) => isObservableMap(value),
  (map) => [...map],
  (entries) => observable.map(entries),
);

const $codable: typeof codable = function () {
  return combineDecorators(codable(), observable);
};

describe("misc", () => {
  it("semi realistic example", () => {
    @codableClass("Project")
    class Project {
      @$codable()
      accessor scenes: Set<Scene> = new Set([]);

      @$codable()
      accessor settings: Map<string, string> = new Map([]);

      @action
      setSetting(key: string, value: string) {
        this.settings.set(key, value);
      }

      @action
      addScene() {
        const scene = new Scene();
        this.scenes.add(scene);

        return scene;
      }
    }

    @codableClass("Scene")
    class Scene {
      @$codable()
      accessor zooms: Array<Zoom> = [];

      @computed
      get duration() {
        return this.zooms.reduce((acc, zoom) => acc + zoom.duration, 0);
      }

      @action
      addZoom(zoom: Zoom) {
        this.zooms.push(zoom);
      }
    }

    @codableClass("Zoom")
    class Zoom {
      @$codable()
      accessor start!: number;

      @$codable()
      accessor end!: number;

      @$codable()
      accessor scale!: number;

      @computed
      get duration() {
        return this.end - this.start;
      }

      constructor(input: Pick<Zoom, "start" | "end" | "scale">) {
        Object.assign(this, input);
      }
    }

    const coder = new Coder([Project, Scene, Zoom, $$observableSet, $$observableMap]);

    const project = new Project();
    const scene = project.addScene();
    scene.addZoom(new Zoom({ start: 0, end: 1, scale: 1 }));
    const zoom2 = new Zoom({ start: 2, end: 3, scale: 2 });
    scene.addZoom(zoom2);
    // Let's test refs
    scene.addZoom(zoom2);

    const encoded = coder.encode(project);

    expect(encoded).toEqual({
      $$Project: [
        {
          settings: { $$_Map: [] },
          scenes: {
            $$_Set: [
              {
                $$Scene: [
                  {
                    zooms: [
                      { $$Zoom: [{ start: 0, end: 1, scale: 1 }] },
                      { $$id: 0, $$Zoom: [{ start: 2, end: 3, scale: 2 }] },
                      { $$ref: 0 },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const decoded = coder.decode<Project>(encoded);

    expect(decoded).toEqual(project);
    expect(decoded.scenes.size).toBe(1);
    const firstScene = decoded.scenes.values().next().value!;
    expect(firstScene.zooms.length).toBe(3);
    expect(firstScene.zooms[1]).toBe(firstScene.zooms[2]);

    const runner = vi.fn(() => {
      const firstScene = decoded.scenes.values().next().value!;
      return [decoded.scenes.size, firstScene.zooms.length, decoded.settings.size];
    });
    const stop = autorun(runner);

    expect(runner).toHaveLastReturnedWith([1, 3, 0]);

    decoded.addScene();

    expect(runner).toHaveLastReturnedWith([2, 3, 0]);

    decoded.scenes
      .values()
      .next()
      .value!.addZoom(new Zoom({ start: 4, end: 5, scale: 3 }));

    expect(runner).toHaveLastReturnedWith([2, 4, 0]);

    decoded.setSetting("theme", "dark");

    expect(runner).toHaveLastReturnedWith([2, 4, 1]);

    decoded.setSetting("language", "en");

    expect(runner).toHaveLastReturnedWith([2, 4, 2]);

    stop();

    const encoded2 = coder.encode(decoded);

    expect(encoded2).toEqual({
      $$Project: [
        {
          scenes: {
            $$_Set: [
              {
                $$Scene: [
                  {
                    zooms: [
                      { $$Zoom: [{ end: 1, scale: 1, start: 0 }] },
                      { $$id: 0, $$Zoom: [{ end: 3, scale: 2, start: 2 }] },
                      { $$ref: 0 },
                      { $$Zoom: [{ end: 5, scale: 3, start: 4 }] },
                    ],
                  },
                ],
              },
              {
                $$Scene: [{ zooms: [] }],
              },
            ],
          },
          settings: {
            $$_Map: [
              ["theme", "dark"],
              ["language", "en"],
            ],
          },
        },
      ],
    });

    const decoded2 = coder.decode<Project>(encoded2);

    expect(decoded2).toEqual(decoded);
    expect(decoded2.settings.size).toBe(2);
    expect(decoded2.settings.get("theme")).toBe("dark");
    expect(decoded2.settings.get("language")).toBe("en");
  });
});

describe("from readme", () => {
  it("encode", () => {
    @codableClass("Player")
    class Player {
      @codable() name: string;
      @codable() score: number;

      constructor(data: Pick<Player, "name" | "score">) {
        this.name = data.name;
        this.score = data.score;
      }
    }

    @codableClass("GameState")
    class GameState {
      @codable() players: Set<Player> = new Set();
      @codable() createdAt = new Date(2025, 10, 28);

      @codable() activePlayer: Player | null = null;

      addPlayer(player: Player) {
        this.players.add(player);
        this.activePlayer = player;
      }
    }

    const coder = new Coder([Player, GameState]);

    const gameState = new GameState();
    gameState.addPlayer(new Player({ name: "Foo", score: 100 }));

    expect(coder.encode(gameState)).toEqual({
      $$GameState: [
        {
          players: {
            $$Set: [{ $$id: 0, $$Player: [{ name: "Foo", score: 100 }] }],
          },
          createdAt: { $$Date: "2025-11-27T23:00:00.000Z" },
          activePlayer: { $$ref: 0 },
        },
      ],
    });
  });
});
