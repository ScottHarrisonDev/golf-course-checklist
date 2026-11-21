import { describe, expect, it } from 'vitest';
import coursesJson from './data/courses.json';
import { MAP_COUNTIES, countyError, countyNamesFromSvg } from './content.config';

describe('countyNamesFromSvg', () => {
  it('reads the title of each county path, decoding entities', () => {
    const svg = `<svg><title>Not a county</title><defs>
      <path id="c0" d="M0 0z"><title>Kent</title></path>
      <path id="c1" d="M1 1z">
        <title>Armagh &amp; Down</title></path>
    </defs></svg>`;
    expect([...countyNamesFromSvg(svg)]).toEqual(['Kent', 'Armagh & Down']);
  });
});

describe('MAP_COUNTIES', () => {
  it('holds the county names from the map artwork', () => {
    expect(MAP_COUNTIES.size).toBeGreaterThan(100);
    for (const name of ['Kent', 'Greater London', 'Dublin']) expect(MAP_COUNTIES.has(name)).toBe(true);
  });
});

describe('countyError', () => {
  it('passes a known county', () => {
    expect(countyError('Kent', 'The Ridge Golf Club')).toBeNull();
    expect(countyError('Greater London', 'A London course')).toBeNull();
  });

  it('fails a misspelt county, naming the course and suggesting the right spelling', () => {
    const message = countyError('Kentt', 'The Ridge Golf Club');
    expect(message).toContain('"The Ridge Golf Club"');
    expect(message).toContain('"Kentt"');
    expect(message).toContain('Did you mean "Kent"?');
  });

  it('fails a county in the wrong case', () => {
    expect(countyError('kent', 'The Ridge Golf Club')).toContain('Did you mean "Kent"?');
  });

  it('fails an unknown county, asking to check the spelling', () => {
    const message = countyError('Atlantis', 'Sunken Links');
    expect(message).toContain('"Sunken Links"');
    expect(message).toContain('Check the spelling');
  });

  it('accepts every county in courses.json', () => {
    for (const course of coursesJson) expect(countyError(course.county, course.name)).toBeNull();
  });
});
