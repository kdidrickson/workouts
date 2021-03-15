import './WorkoutSummary.scss';

import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';
import Card from 'react-bootstrap/Card';

import React from 'react';
import lodash from 'lodash';

import {Workout, Exercise, WorkoutLog} from './types';
import {WorkoutSetHistory, workoutSetHasHistory} from './WorkoutSetHistory';

export interface WorkoutSummaryProps {
  workout: Workout;
  exercises: {[key: string]: Exercise};
  workoutLogs?: {[key: string]: WorkoutLog} | null;
  currentWorkoutSetId?: string;
  finishedSetIds?: string[];
  skippedSetIds?: string[];
  snoozedSetIds?: string[];
}

export class WorkoutSummary extends React.Component<WorkoutSummaryProps, {}> {
  constructor(props: WorkoutSummaryProps) {
    super(props);
    this.renderWorkoutSummarySets = this.renderWorkoutSummarySets.bind(this);
  }

  renderWorkoutSummarySets() {
    const {
      workout: {workoutSets},
      exercises,
      workoutLogs,
      currentWorkoutSetId,
      finishedSetIds,
      skippedSetIds,
      snoozedSetIds,
    } = this.props;

    return Object.keys(workoutSets).map((workoutSetId, index) => {
      const workoutSet = workoutSets[workoutSetId];

      if(!workoutSet.exerciseId) {
        return null;
      }

      const exercise = exercises[workoutSet.exerciseId];

      if(!exercise) {
        return null;
      }

      let workoutSetStatus = 'virgin';
      if(finishedSetIds && finishedSetIds.includes(workoutSetId)) {
        workoutSetStatus = 'finished';
      }
      if(skippedSetIds && skippedSetIds.includes(workoutSetId)) {
        workoutSetStatus = 'skipped';
      }
      if(snoozedSetIds && snoozedSetIds.includes(workoutSetId)) {
        workoutSetStatus = 'snoozed';
      }

      return (
        <Accordion>
          <Accordion.Toggle
            eventKey={String(index)}
            as={ListGroup.Item}
            className={`
              workout-summary__set
              workout-summary__set--${workoutSetStatus}
              workout-summary__set--${currentWorkoutSetId === workoutSetId ? 'current' : 'not-current'}
            `}
          >
            {`${exercise.name}${workoutSet.targetReps ? ` x ${workoutSet.targetReps}` : ''}`}
            {workoutSet.notes && (
              <div className="workout-summary__set__notes">
                {workoutSet.notes}
              </div>
            )}
            {workoutSetHasHistory(workoutLogs, workoutSetId) && (
              <Accordion.Collapse eventKey={String(index)}>
                <div className="workout-summary__set__history mt-3">
                  <h6>
                    Recent History
                  </h6>
                  <Card>
                    <WorkoutSetHistory
                      workoutSetId={workoutSetId}
                      workoutLogs={workoutLogs}
                    />
                  </Card>
                </div>
              </Accordion.Collapse>
            )}
          </Accordion.Toggle>
        </Accordion>
      );
    });
  }

  render() {
    const {workout: {workoutSets}} = this.props;

    if(lodash.isEmpty(workoutSets)) {
      return null;
    }

    const workoutSummarySets = this.renderWorkoutSummarySets();
    if(workoutSummarySets.every(workoutSummarySet => !workoutSummarySet)) {
      return null;
    }

    return (
      <div className="workout-summary">
        <ListGroup>
          {workoutSummarySets}
        </ListGroup>
      </div>
    );
  }
}