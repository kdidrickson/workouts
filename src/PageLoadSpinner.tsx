import './PageLoadSpinner.scss';

import Spinner from 'react-bootstrap/Spinner';

import React from 'react';

export const PageLoadSpinner = () => (
  <div className="page-load-spinner">
    <Spinner animation="border" role="status">
      <span className="sr-only">Loading...</span>
    </Spinner>
  </div>
);
