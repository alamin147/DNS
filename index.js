# DNS

// prerequisite: npm, node installed
// install this package
// npm i dns-packet

const dgram = require("node:dgram");
const dnspacket = require("dns-packet");
const server = dgram.createSocket("udp4");

const db_of_IP = {
  "a.com": "1.13.1.6",
  "b.com": "155.103.10.60",
  "diu.com": "456.12.4.6",
};

const blockedIps = ["192.168.1.1", "10.0.0.1"];

const userRequestLog = {};
const MAX_REQUESTS_PER_MINUTE = 2;
const TIME_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_BEFORE_BLOCK = 4; // Limit of 4 requests per minute before blocking

server.on("message", (msg, rinfo) => {
  const ip = rinfo.address;
  const currentTime = Date.now();
  //   console.log({"here ip":ip})
  //   blockedIps.push(ip);

  //   blockedIps.forEach((e) => {
  //     console.log(e, "\n");
  //   });

  if (blockedIps.includes(ip)) {
    console.log(`Request from ${ip} is blocked due to excessive queries.`);
    return;
  }

  if (!userRequestLog[ip]) {
    userRequestLog[ip] = [];
  }

  userRequestLog[ip] = userRequestLog[ip].filter(
    (requestTime) => currentTime - requestTime <= TIME_WINDOW
  );

  if (userRequestLog[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    console.log(`Rate limit exceeded for IP: ${ip}`);
    return;
  }
  userRequestLog[ip].push(currentTime);

  if (userRequestLog[ip].length > MAX_REQUESTS_BEFORE_BLOCK) {
    if (!blockedIps.includes(ip)) {
      blockedIps.push(ip);
      console.log(`IP ${ip} added to blocked list due to excessive requests.`);
    }
    return;
  }

  // Normal query
  const incomeReq = dnspacket.decode(msg);
  const ipDB = db_of_IP[incomeReq.questions[0].name];

  console.log(
    `Received query from ${rinfo.address}:${rinfo.port} for ${incomeReq.questions[0].name}`
  );

  if (!ipDB) {
    console.log(`No IP found for ${incomeReq.questions[0].name}`);
    return;
  }

  const ans = dnspacket.encode({
    type: "response",
    id: incomeReq.id,
    flags: dnspacket.AUTHORITATIVE_ANSWER,
    questions: incomeReq.questions,
    answers: [
      {
        type: "A",
        class: "IN",
        name: incomeReq.questions[0].name,
        data: ipDB,
      },
    ],
  });

  server.send(ans, rinfo.port, rinfo.address);
});

server.bind(8000, () => console.log("DNS server running"));
