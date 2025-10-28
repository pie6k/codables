import { Coder } from "../Coder";
import { createCoderType } from "../CoderType";
import { codable } from "../decorators/codable";
import { codableClass } from "../decorators/codableClass";
import { observable, isObservableSet, autorun, action, isObservableMap } from "mobx";

const $$observableSet = createCoderType(
  "_Set",
  (value) => isObservableSet(value),
  (set) => [...set],
  (items) => observable.set(items),
);

const $$observableMap = createCoderType(
  "_Map",
  (value) => isObservableMap(value),
  (map) => [...map],
  (entries) => observable.map(entries),
);

describe("misc", () => {
  it("semi realistic example", () => {
    @codableClass("Project")
    class Project {
      @codable()
      @observable
      accessor scenes: Set<Scene> = new Set([]);

      @codable()
      @observable
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
      @codable()
      @observable
      accessor zooms: Array<Zoom> = [];

      @action
      addZoom(zoom: Zoom) {
        this.zooms.push(zoom);
      }
    }

    @codableClass("Zoom")
    class Zoom {
      @codable()
      @observable
      accessor start!: number;

      @codable()
      @observable
      accessor end!: number;

      @codable()
      @observable
      accessor scale!: number;

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
                      { $$Zoom: [{ start: 2, end: 3, scale: 2 }] },
                      { $$ref: "/$$Project/0/scenes/$$_Set/0/$$Scene/0/zooms/1" },
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
                      { $$Zoom: [{ end: 3, scale: 2, start: 2 }] },
                      { $$ref: "/$$Project/0/scenes/$$_Set/0/$$Scene/0/zooms/1" },
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
