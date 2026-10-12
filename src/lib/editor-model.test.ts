import { describe, expect, it } from 'vitest';
import { addMediaClip, createClip, createProject, dimensions, durationOf, splitClip, validateProject } from './editor-model';
import { parseSrt } from './media-import';
describe('composition model', () => {
  it('splits source offsets consistently with speed', () => { const c = { ...createClip('video', 'video'), duration: 8, offset: 2, speed: 2 }; const result = splitClip([c], c.id, 3); expect(result).toHaveLength(2); expect(result[0]?.duration).toBe(3); expect(result[1]?.offset).toBe(8); expect(result[1]?.duration).toBe(5); });
  it('does not split outside a clip', () => { const c = createClip('image', 'image'); expect(splitClip([c], c.id, 0)).toHaveLength(1); });
  it('generates even video dimensions', () => { expect(dimensions('16:9', 720)).toEqual([1280,720]); expect(dimensions('9:16', 1080)).toEqual([1080,1920]); expect(dimensions('1:1',720)).toEqual([720,720]); });
  it('validates missing media and empty export', () => { const p = createProject(); expect(validateProject(p)).toMatch('pelo menos'); const c = createClip('video','missing'); c.mediaId = 'missing'; p.clips.push(c); expect(validateProject(p)).toMatch('não está disponível'); });
  it('calculates total timeline duration', () => { const p = createProject(); p.clips = [{...createClip('text','title',3),duration:5}]; expect(durationOf(p)).toBe(8); });
  it('parses SRT timestamps and discards invalid entries', () => { const result = parseSrt('1\n00:00:01,000 --> 00:00:03,500\nOlá\n\n2\ninvalid\ntext'); expect(result).toEqual([{start:1,duration:2.5,text:'Olá'}]); });
});