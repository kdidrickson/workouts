import './Workout.scss';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';

import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {withRouter, RouteComponentProps} from "react-router";
import {Link} from 'react-router-dom';
import * as lodash from 'lodash';

import {ExerciseLogging} from './ExerciseLogging';
import {WorkoutSummary} from './WorkoutSummary';
import {Exercise, Workout as WorkoutType, WorkoutSet, WorkoutSubset, WorkoutLog} from './types';
import {PageLoadSpinner} from './PageLoadSpinner';


interface WorkoutProps extends RouteComponentProps<{id: string}> {
  user: firebase.User;
}

interface WorkoutState {
  isRunning: boolean;
  workout?: WorkoutType;
  currentWorkoutSetId: string | null;
  exercises?: {[key: string]: Exercise},
  workoutLogs?: {[key: string]: WorkoutLog} | null;
  isResting: boolean;
  workoutLogRef?: firebase.database.Reference;
  isFinished: boolean;
  setsCompleted: number;
  finishedSetIds: string[];
  skippedSetIds: string[];
  snoozedSetIds: string[];
  start?: number;
  end?: number;
  loggingSubsets: WorkoutSubset[];
}

class WorkoutWithoutRouter extends React.Component<WorkoutProps, WorkoutState> {
  constructor(props: WorkoutProps) {
    super(props);
    this.state = {
      isRunning: false,
      currentWorkoutSetId: null,
      isResting: false,
      isFinished: false,
      setsCompleted: 0,
      finishedSetIds: [],
      skippedSetIds: [],
      snoozedSetIds: [],
      loggingSubsets: [],
    };
    this.renderActiveWorkout = this.renderActiveWorkout.bind(this);
    this.renderStagingWorkout = this.renderStagingWorkout.bind(this);
    this.isFinished = this.isFinished.bind(this);
  }

  componentDidMount() {
    firebase.database().ref(
      `workouts/${this.props.user.uid}/${this.props.match.params.id}`
    ).once('value', (snapshot) => {
      const workout = snapshot.val();
      if(workout && workout.name && workout.workoutSets) {
        this.setState({workout});
        firebase.database().ref(
          `workouts/${this.props.user.uid}/${this.props.match.params.id}`
        ).update({
          lastAccessed: Date.now(),
        });
      } else {
        this.setState({workout: null});
      }
    });
    firebase.database().ref(
      `exercises/${this.props.user.uid}`
    ).on('value', (snapshot) => {
      this.setState({exercises: snapshot.val()});
    });
    firebase.database().ref(
      `workoutLogs/${this.props.user.uid}`
    ).limitToLast(3).on('value', (snapshot) => {
      this.setState({workoutLogs: snapshot.val()});
    });
  }

  componentDidUpdate(prevProps: WorkoutProps, prevState: WorkoutState) {
    if(this.state.workout && !prevState.isRunning && this.state.isRunning) {
      this.setState({
        currentWorkoutSetId: this.getNextWorkoutSetId(),
      });
    }

    if(!prevState.isRunning && this.state.isRunning) {
      const workoutLogRef = firebase.database().ref(`workoutLogs/${this.props.user.uid}`).push();
      const start = Date.now()
      workoutLogRef.set({start})
      this.setState({workoutLogRef, start});
    }

    if(!prevState.isFinished && this.state.isFinished && this.state.workoutLogRef) {
      const end = Date.now();
      this.state.workoutLogRef.update({end});
      this.setState({
        end,
        currentWorkoutSetId: null,
      });
    }

    const finishedSetIdsDidUpdate = prevState.finishedSetIds !== this.state.finishedSetIds;
    const skippedSetIdsDidUpdate = prevState.skippedSetIds !== this.state.skippedSetIds;
    if(finishedSetIdsDidUpdate || skippedSetIdsDidUpdate) {
      const snoozedSetIds = lodash.difference(
        this.state.snoozedSetIds,
        this.state.finishedSetIds,
        this.state.skippedSetIds,
      );
      this.setState({
        snoozedSetIds,
        setsCompleted: this.state.setsCompleted + Number(finishedSetIdsDidUpdate),
        isFinished: this.isFinished(),
        currentWorkoutSetId: this.getNextWorkoutSetId(),
        isResting: false,
      });
    }

    if(prevState.snoozedSetIds !== this.state.snoozedSetIds) {
      this.setState({
        currentWorkoutSetId: this.getNextWorkoutSetId(),
      });
    }
  }

  isFinished() {
    const {finishedSetIds, skippedSetIds, workout} = this.state;
    return finishedSetIds.length + skippedSetIds.length >= Object.keys(workout.workoutSets).length;
  }

  getNextWorkoutSetId(simulateSnoozed?: string): string | null {
    const {workout, finishedSetIds, skippedSetIds, currentWorkoutSetId} = this.state;
    let {snoozedSetIds} = this.state;

    if(simulateSnoozed) {
      snoozedSetIds = [...snoozedSetIds, simulateSnoozed];
    }

    if(!workout) {
      return null;
    }

    let virginWorkoutSets = {...workout.workoutSets};
    finishedSetIds.forEach(finishedSetId => {
      delete virginWorkoutSets[finishedSetId];
    });
    skippedSetIds.forEach(skippedSetId => {
      delete virginWorkoutSets[skippedSetId];
    });
    snoozedSetIds.forEach(snoozedSetId => {
      delete virginWorkoutSets[snoozedSetId];
    });

    const virginWorkoutSetIds = Object.keys(virginWorkoutSets);
    if(virginWorkoutSetIds.length) {
      return virginWorkoutSetIds[0];
    }

    if(snoozedSetIds.length) {
      const currentSnoozedIndex = lodash.indexOf(snoozedSetIds, currentWorkoutSetId);
      return snoozedSetIds[currentSnoozedIndex + 1] || snoozedSetIds[0];
    }

    return null;
  }

  renderWorkoutSetHistory(workoutLogs: {[key: string]: WorkoutLog}) {
    const {currentWorkoutSetId} = this.state;

    const hasHistory = Object.keys(workoutLogs).some(workoutLogId =>
      workoutLogs[workoutLogId]
      && workoutLogs[workoutLogId].workoutSets
      && workoutLogs[workoutLogId].workoutSets[currentWorkoutSetId]
    );
    if(!hasHistory) {
      return null;
    }

    return (
      <div className="workout-set-history">
        <Card>
          <Card.Body>
            <Card.Title>
              Recent History
            </Card.Title>
            <Card.Text>
              <ListGroup variant="flush">
                {Object.keys(workoutLogs).reverse().map(workoutLogId => {
                  const {start, workoutSets} = workoutLogs[workoutLogId];
                  if(
                    !start
                    || !workoutSets
                    || !workoutSets[currentWorkoutSetId]
                    || (!workoutSets[currentWorkoutSetId].subsets && !workoutSets[currentWorkoutSetId].skipped)
                  ) {
                    return null;
                  }

                  const workoutSet = workoutSets[currentWorkoutSetId];

                  return (
                    <ListGroup.Item>
                      <h6 className="workout-set-history__set__date">
                        {new Date(start).toISOString().slice(0,10)}
                      </h6>
                      {workoutSet.skipped ? (
                        <div className="workout-set-history__set__skipped">
                          Skipped
                        </div>
                      ) : (
                        <div className="workout-set-history__set__subsets">
                          <Table striped bordered hover size="sm">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Reps</th>
                                <th>Sets</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(workoutSet.subsets).map((subsetId, index) => {
                                const subset = workoutSet.subsets[subsetId];
                                if(!subset.reps || !subset.weight) {
                                  return null;
                                }
    
                                return (
                                  <tr>
                                    <td>{index + 1}</td>
                                    <td>{subset.reps}</td>
                                    <td>{subset.weight}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Text>
          </Card.Body>
        </Card>
      </div>
    );
  }

  renderExerciseExecution(workoutSet: WorkoutSet, exercise: Exercise) {
    return (
      <div className="workout__active__exercise-execution">
        <p className="workout__active__target-reps">
          {`Target: ${workoutSet.targetReps} rep${workoutSet.targetReps === 1 ? '' : 's'}`}
        </p>
        {exercise.notes && <p className="workout__active__notes">{exercise.notes}</p>}
        {exercise.youtubeUrl && (
          <p className="workout__active__more-info">
            <a href={exercise.youtubeUrl} target="_blank">
              More info
            </a>
          </p>
        )}
      </div>
    );
  }

  renderExerciseLoggingActions() {
    const {
      loggingSubsets,
      workoutLogRef,
      currentWorkoutSetId,
      setsCompleted,
      finishedSetIds
    } = this.state;

    if(loggingSubsets.length && loggingSubsets.every(({reps, weight}) => reps && weight)) {
      return (
        <Button
          className="exercise-logging__submit-button"
          onClick={async () => {
            if(workoutLogRef && currentWorkoutSetId) {
              workoutLogRef.child(`workoutSets/${currentWorkoutSetId}`).set({setsCompleted});
              const subsetsRef = workoutLogRef.child(`workoutSets/${currentWorkoutSetId}/subsets`);
              loggingSubsets.forEach(workoutSubset => subsetsRef.push().set(workoutSubset));
            }
            this.setState({
              finishedSetIds: [...finishedSetIds, currentWorkoutSetId],
            });
          }}
        >
          Proceed
        </Button>
      )
    }

    return (
      <Alert variant="info" className="exercise-logging__alert">
        {`You must complete all the logging fields to continue.`}
      </Alert>
    );
  }

  renderExerciseExecutionActions() {
    const {currentWorkoutSetId, skippedSetIds, snoozedSetIds, workoutLogRef} = this.state;
    return (
      <>
        <Button
          variant="primary"
          className="workout__active__done-button"
          onClick={() => {
            this.setState({isResting: true});
          }}
        >
          Done!
        </Button>
        <Button
          variant="secondary"
          className="workout__active__skip-button float-right"
          onClick={() => {
            this.setState({skippedSetIds: [...skippedSetIds, currentWorkoutSetId]});
            if(workoutLogRef) {
              workoutLogRef.child(`workoutSets/${currentWorkoutSetId}`).update({
                skipped: true,
              })
            }
          }}
        >
          Skip
        </Button>
        {this.getNextWorkoutSetId(currentWorkoutSetId) !== currentWorkoutSetId && (
          <Button
            variant="warning"
            className="workout__active__snooze-button float-right"
            onClick={() => {
              this.setState({snoozedSetIds: [...snoozedSetIds, currentWorkoutSetId]});
            }}
          >
            Snooze
          </Button>
        )}
      </>
    );
  }

  renderFinishedWorkout() {
    const {start, end} = this.state;

    let workoutDuration;
    if(start && end) {
      const date = new Date(0);
      date.setMilliseconds(end - start);
      workoutDuration = date.toISOString().substr(11, 8);
    }

    return (
      <div className="workout__finished">
        <h1>All done! 💪</h1>
        {workoutDuration && (
          <p className="workout__finished__duration">
            {`Workout duration: ${workoutDuration}`}
          </p>
        )}
        <Link className="workout__finished__home-button" to="/">
          Back home
        </Link>
      </div>
    );
  }

  renderActiveWorkout() {
    const {
      workout,
      exercises,
      workoutLogs,
      currentWorkoutSetId,
      isResting,
      isFinished,
    } = this.state;
    
    if(isFinished) {
      return this.renderFinishedWorkout();
    }

    if(!currentWorkoutSetId || workoutLogs === undefined) {
      return <PageLoadSpinner />
    }

    const currentWorkoutSet = workout.workoutSets[currentWorkoutSetId];
    const currentExercise = exercises[currentWorkoutSet.exerciseId];

    return (
      <div className="workout__active">
        <Card>
          <Card.Body>
            <Card.Title>
              {currentExercise.name}
            </Card.Title>
            {isResting ?
              <ExerciseLogging
                workoutSet={currentWorkoutSet}
                exercise={currentExercise}
                onSubsetInputChange={(loggingSubsets) => {
                  this.setState({loggingSubsets});
                }}
              /> :
              this.renderExerciseExecution(currentWorkoutSet, currentExercise)
            }
          </Card.Body>
          <Card.Footer>
            {isResting ? this.renderExerciseLoggingActions() : this.renderExerciseExecutionActions()}
          </Card.Footer>
        </Card>
        {workoutLogs && this.renderWorkoutSetHistory(workoutLogs)}
      </div>
    );
  }

  renderWorkoutHistorySummary(workoutLogs: {[key: string]: WorkoutLog} | null) {
    if(workoutLogs) {
      const workoutLogsKeys = Object.keys(workoutLogs);
      const lastWorkoutLog = workoutLogs[workoutLogsKeys[workoutLogsKeys.length - 1]];
      if(lastWorkoutLog.start) {
        const lastWorkoutStartDate = new Date(lastWorkoutLog.start);
        return `You last did this workout on ${lastWorkoutStartDate.toISOString().slice(0,10)}`;
      }
    }

    return `You've never done this workout before.`;
  }

  renderStagingWorkout() {
    const {workout, exercises, workoutLogs} = this.state;
    const {user, match: {params}} = this.props;

    if(workout === null) {
      return (
        <Alert variant="warning">
          {`This workout doesn't exist!`}
        </Alert>
      );
    }

    return (
      <div className="workout__staging">
        <Card>
          <Card.Body>
            <Card.Title>
              <div className="workout__staging__header">
                {workout.name}
              </div>
            </Card.Title>
            <div className="workout__history-summary">
              {this.renderWorkoutHistorySummary(workoutLogs)}
            </div>
          </Card.Body>
          <Card.Footer>
            <Button
              variant="primary"
              className="workout__staging__start-button"
              onClick={() => {
                this.setState({isRunning: true});
              }}
            >
              Start workout
            </Button>
            <Button
              variant="danger"
              className="workout__staging__delete-button float-right"
              onClick={() => {
                const workoutRef = firebase.database().ref(`workouts/${user.uid}/${params.id}`);
                workoutRef.remove().then(() => {
                  window.location.pathname = '/';
                })
              }}
            >
              Delete workout
            </Button>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  render() {
    const {workout, exercises, workoutLogs} = this.state;
    
    return (
      <div className="workout">
        {!workout || !exercises || workoutLogs === undefined ? <PageLoadSpinner /> : (
          <Container>
            <Row>
              <Col xs={12}>
                {this.state.isRunning ? this.renderActiveWorkout() : this.renderStagingWorkout()}
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <div className="workout__workout-summary mt-5">
                  <WorkoutSummary
                    workout={workout}
                    exercises={exercises}
                    currentWorkoutSetId={this.state.currentWorkoutSetId}
                    finishedSetIds={this.state.finishedSetIds}
                    skippedSetIds={this.state.skippedSetIds}
                    snoozedSetIds={this.state.snoozedSetIds}
                  />
                </div>
              </Col>
            </Row>
          </Container>
        )}
      </div>
    );
  }
}

export const Workout = withRouter<WorkoutProps, typeof WorkoutWithoutRouter>(WorkoutWithoutRouter);