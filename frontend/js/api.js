const API = 'http://localhost:3000/api';

const http = {
  get: (url) => fetch(API + url).then(r => r.json()),
  post: (url, body) => fetch(API + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (url, body) => fetch(API + url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (url) => fetch(API + url, { method: 'DELETE' }).then(r => r.json()),
};