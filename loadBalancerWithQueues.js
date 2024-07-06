
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');

const app = express();
const port = 3000;

app.use(express.json());
app.use(morgan('combined'));

// Mock endpoints
const endpoints = {
  rest: [
    'http://localhost:3001/rest/slow',
    'http://localhost:3001/rest/fast',
    'http://localhost:3001/rest/moderate',
    'http://localhost:3001/rest/extra',
  ],
};

// Queues
const roundRobinQueue = [];
let roundRobinIndex = 0;

// Metrics
const metrics = {
  roundRobin: { count: 0, totalTime: 0 },
  endpointSelections: {},
};

// Enqueue requests
const enqueueRequest = (queue, req, res) => {
  queue.push({ req, res, timestamp: Date.now() });
};

// Dequeue and process requests
const dequeueAndProcessRequest = (queue) => {
  if (queue.length > 0) {
    const request = queue.shift();
    processRequest(request.req, request.res, 'roundRobin');
  }
};

// Process request and log metrics
const processRequest = (req, res, strategy) => {
  const apiType = req.query.type || 'rest';
  if (!apiType || !endpoints[apiType]) {
    return res.status(400).send('Invalid API type');
  }

  const targetUrl = getRoundRobinEndpoint(apiType);
  const startTime = Date.now();

  axios({
    method: req.method,
    url: targetUrl,
    data: req.body,
  })
    .then((response) => {
      const duration = Date.now() - startTime;
      updateMetrics(strategy, targetUrl, duration);
      res.status(response.status).send(response.data);
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      updateMetrics(strategy, targetUrl, duration);
      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        res.status(500).send('Internal Server Error');
      }
    });
};

// Round-robin endpoint selection
const getRoundRobinEndpoint = (apiType) => {
  const availableEndpoints = endpoints[apiType];
  const endpoint = availableEndpoints[roundRobinIndex];
  roundRobinIndex = (roundRobinIndex + 1) % availableEndpoints.length;
  return endpoint;
};

// Update metrics
const updateMetrics = (strategy, endpoint, responseTime) => {
  metrics[strategy].count += 1;
  metrics[strategy].totalTime += responseTime;
  if (!metrics.endpointSelections[endpoint]) {
    metrics.endpointSelections[endpoint] = 0;
  }
  metrics.endpointSelections[endpoint] += 1;
};

app.all('*', (req, res) => {
  const apiType = req.query.type || 'rest';
  const strategy = req.query.strategy || 'roundRobin';

  if (!endpoints[apiType]) {
    return res.status(400).send('Invalid API type');
  }

  // Enqueue request
  if (strategy === 'roundRobin') {
    enqueueRequest(roundRobinQueue, req, res);
  } else {
    res.status(400).send('Invalid strategy');
  }
});

// Process round-robin queue at intervals
setInterval(() => dequeueAndProcessRequest(roundRobinQueue), 1000);


app.listen(port, () => {
  console.log(`Load balancer with queues running on port ${port}`);
});

// Log metrics periodically
setInterval(() => {
  console.log('Metrics:', metrics);
}, 10000);
