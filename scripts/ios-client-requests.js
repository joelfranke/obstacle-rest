/**
 * Request shapes compiled by the three iOS apps (Goliathon, Check In, Recorder).
 *
 * Keys and dictionaries follow Shared Components/API Components.swift and the
 * POST builders in RegisterViewController, ObstacleTileRecorderVC,
 * TimingRecorderViewController, and StopwatchViewController.
 *
 * The apps send Content-Type: application/json and header k on almost every
 * call, including GETs. GET /teams via Data(contentsOf:) is the exception
 * and omits k.
 */

const POST_REGISTRANT_KEY = 'registration';
const POST_OBSTACLE_RESULT_KEY = 'post-result';
const GET_PARTICIPANT_RESULT_KEY = 'results';
const GET_PARTICIPANT_SCORE_KEY = 'scoring';
const GET_PARTICIPANT_INFO_KEY = 'participant';
const GET_HEAT_TIME_KEY = 'heats';
const GET_TEAM_KEY = 'teams';
const TIMING_KEY = 'timing';

const GET_BY_LASTNAME_PARAM = 'lastName=';
const GET_BY_BIBNO_PARAM = 'bibNo=';
const GET_DAVIDS_PARAM = 'davids';
const GET_TEAM_SCORES_PARAM = 'teamScores';
const GET_LEADER_SEX_KEY = 'gender';
const GET_TEAM_MEMBERS_KEY = 'onTeam';
const LIMIT_NUM_LEADERS_TO_SHOW_KEY = 'limit';

function encodeLastName(lastName) {
  return encodeURIComponent(lastName);
}

function iosHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.k = token;
  return headers;
}

function registrationUrl() {
  return '/' + POST_REGISTRANT_KEY;
}

function postResultUrl() {
  return '/' + POST_OBSTACLE_RESULT_KEY;
}

function timingUrl() {
  return '/' + TIMING_KEY;
}

function heatsUrl() {
  return '/' + GET_HEAT_TIME_KEY;
}

function teamsUrl() {
  return '/' + GET_TEAM_KEY;
}

function resultsUrl(bibNo) {
  return '/' + GET_PARTICIPANT_RESULT_KEY + '/' + encodeURIComponent(String(bibNo));
}

function participantUrl(opts) {
  const q = opts || {};
  let path = '/' + GET_PARTICIPANT_INFO_KEY + '?';
  if (q.bibNo != null) path += GET_BY_BIBNO_PARAM + encodeURIComponent(String(q.bibNo));
  else if (q.lastName != null) path += GET_BY_LASTNAME_PARAM + encodeLastName(q.lastName);
  else if (q.bday != null) path += 'bday=' + encodeURIComponent(q.bday);
  else if (q.onTeam != null) path += GET_TEAM_MEMBERS_KEY + '=' + encodeURIComponent(q.onTeam);
  else throw new Error('participantUrl requires bibNo, lastName, bday, or onTeam');
  return path;
}

function scoringUrl(opts) {
  const q = opts || {};
  const base = '/' + GET_PARTICIPANT_SCORE_KEY + '?';
  if (q.gender != null) {
    let path = base + GET_LEADER_SEX_KEY + '=' + encodeURIComponent(q.gender);
    if (q.limit != null) path += '&' + LIMIT_NUM_LEADERS_TO_SHOW_KEY + '=' + encodeURIComponent(String(q.limit));
    return path;
  }
  if (q.teamScores) return base + GET_TEAM_SCORES_PARAM + '=true';
  if (q.team != null) return base + 'team=' + encodeURIComponent(q.team);
  if (q.onTeam != null) return base + GET_TEAM_MEMBERS_KEY + '=' + encodeURIComponent(q.onTeam);
  if (q.davids) return base + GET_DAVIDS_PARAM + '=true';
  if (q.bibNo != null) return base + GET_BY_BIBNO_PARAM + encodeURIComponent(String(q.bibNo));
  throw new Error('scoringUrl requires gender, teamScores, team, onTeam, davids, or bibNo');
}

function registrationBody(person) {
  return {
    bibNo: person.bibNo,
    heat: person.heat || '',
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    teamID: person.teamID || '',
    gender: person.gender,
    birthdate: person.birthdate,
    address1: person.address1,
    address2: person.address2 || '',
    city: person.city,
    state: person.state,
    zip: person.zip,
    phone: person.phone || '',
    group: person.group,
  };
}

function checkInBody(person) {
  return {
    _id: person._id,
    bibNo: person.bibNo,
    heat: person.heat || '',
    firstName: person.firstName,
  };
}

function timingBody(person, location, extras) {
  const extra = extras || {};
  const body = {
    bibNo: person.bibNo,
    location: location,
    bibFromBand: extra.bibFromBand != null ? extra.bibFromBand : true,
    deviceTime: extra.deviceTime,
  };
  if (location === 'tiebreaker') body.time = extra.time;
  return body;
}

function postResultBody(person, obstacle, tier, success, extras) {
  const extra = extras || {};
  return {
    bibNo: person.bibNo,
    obstID: Number(obstacle.sequence != null ? obstacle.sequence : obstacle),
    tier: tier,
    bibFromBand: extra.bibFromBand != null ? extra.bibFromBand : true,
    success: success,
    deviceTime: extra.deviceTime,
  };
}

module.exports = {
  iosHeaders,
  registrationUrl,
  postResultUrl,
  timingUrl,
  heatsUrl,
  teamsUrl,
  resultsUrl,
  participantUrl,
  scoringUrl,
  registrationBody,
  checkInBody,
  timingBody,
  postResultBody,
};
