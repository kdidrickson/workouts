import './WorkoutSetHistory.scss';

import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';

import React from 'react';

import {WorkoutLog} from './types';

interface WorkoutSetHistoryProps {
  workoutSetId: string;
  workoutLogs: {[key: string]: WorkoutLog};
}

export const workoutSetHasHistory = (
  workoutLogs: {[key: string]: WorkoutLog} | null,
  workoutSetId: string
) => (
  workoutLogs && Object.keys(workoutLogs).some(workoutLogId =>
    workoutLogs[workoutLogId]
    && workoutLogs[workoutLogId].workoutSets
    && workoutLogs[workoutLogId].workoutSets[workoutSetId]
  )
);

export const WorkoutSetHistory = (props: WorkoutSetHistoryProps) => {
  const {workoutSetId, workoutLogs} = props;

  if(!workoutSetHasHistory(workoutLogs, workoutSetId)) {
    return null;
  }

  return (
    <div className="workout-set-history">
      <ListGroup variant="flush">
        {Object.keys(workoutLogs).reverse().map(workoutLogId => {
          const {start, workoutSets} = workoutLogs[workoutLogId];
          if(
            !start
            || !workoutSets
            || !workoutSets[workoutSetId]
            || (!workoutSets[workoutSetId].subsets && !workoutSets[workoutSetId].skipped)
          ) {
            return null;
          }

          const workoutSet = workoutSets[workoutSetId];

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
                        <th>Weight (lbs)</th>
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
    </div>
  );
}