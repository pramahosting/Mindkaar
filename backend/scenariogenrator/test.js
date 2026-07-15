const dateTimeString = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });

console.log(dateTimeString.replace(/[\s/,:]/g, ""))