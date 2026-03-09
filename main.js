const fs = require("fs");

// Helper: parse "hh:mm:ss am/pm" to total seconds
function parseTimeToSeconds(timeStr) {
    timeStr = timeStr.trim();
    const parts = timeStr.split(" ");
    const period = parts[1].toLowerCase(); // am or pm
    const timeParts = parts[0].split(":").map(Number);
    let hours = timeParts[0];
    const minutes = timeParts[1];
    const seconds = timeParts[2];

    if (period === "am") {
        if (hours === 12) hours = 0;
    } else {
        if (hours !== 12) hours += 12;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

// Helper: parse "h:mm:ss" or "hhh:mm:ss" to total seconds
function parseDurationToSeconds(durationStr) {
    const parts = durationStr.trim().split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

// Helper: format total seconds to "h:mm:ss"
function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Helper: format total seconds to "hhh:mm:ss" (padded to at least 3 digits for hours? no - just no padding needed)
function formatDurationLong(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    const startSec = parseTimeToSeconds(startTime);
    const endSec = parseTimeToSeconds(endTime);
    const diff = endSec - startSec;
    return formatDuration(diff);
}
// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    const startSec = parseTimeToSeconds(startTime);
    const endSec = parseTimeToSeconds(endTime);

    const deliveryStart = 8 * 3600;   // 8:00 AM in seconds
    const deliveryEnd = 22 * 3600;    // 10:00 PM in seconds

    let idleBefore = 0;
    let idleAfter = 0;

    // Idle before delivery hours
    if (startSec < deliveryStart) {
        idleBefore = Math.min(deliveryStart, endSec) - startSec;
        if (idleBefore < 0) idleBefore = 0;
    }

    // Idle after delivery hours
    if (endSec > deliveryEnd) {
        idleAfter = endSec - Math.max(deliveryEnd, startSec);
        if (idleAfter < 0) idleAfter = 0;
    }

    return formatDuration(idleBefore + idleAfter);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
function getActiveTime(shiftDuration, idleTime) {
    const shiftSec = parseDurationToSeconds(shiftDuration);
    const idleSec = parseDurationToSeconds(idleTime);
    return formatDuration(shiftSec - idleSec);
}
// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const activeSec = parseDurationToSeconds(activeTime);

    // Check if date is within Eid al-Fitr period: April 10–30, 2025
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    const day = d.getDate();

    let quotaSec;
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        quotaSec = 6 * 3600; // 6 hours
    } else {
        quotaSec = 8 * 3600 + 24 * 60; // 8 hours 24 minutes
    }

    return activeSec >= quotaSec;
}
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const { driverID, driverName, date, startTime, endTime } = shiftObj;

    let fileContent = "";
    try {
        fileContent = fs.readFileSync(textFile, { encoding: "utf8" });
    } catch (e) {
        fileContent = "";
    }

    const lines = fileContent.split("\n").filter(l => l.trim() !== "");

    // Check for duplicate (same driverID and date)
    for (const line of lines) {
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID && cols[2] === date) {
            return {};
        }
    }

    // Calculate fields
    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime = getIdleTime(startTime, endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quota = metQuota(date, activeTime);
    const hasBonus = false;

    const newRecord = {
        driverID,
        driverName,
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus
    };

    const newLine = `${driverID},${driverName},${date},${startTime.trim()},${endTime.trim()},${shiftDuration},${idleTime},${activeTime},${quota},${hasBonus}`;

    // Find where to insert: after the last record of this driverID, or at the end
    let lastIndexOfDriver = -1;
    for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (cols[0] === driverID) {
            lastIndexOfDriver = i;
        }
    }

    if (lastIndexOfDriver === -1) {
        // driverID not found, append at end
        lines.push(newLine);
    } else {
        // Insert after last record of this driverID
        lines.splice(lastIndexOfDriver + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n") + "\n", { encoding: "utf8" });

    return newRecord;
}


// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let fileContent = fs.readFileSync(textFile, { encoding: "utf8" });
    const lines = fileContent.split("\n");

    const updatedLines = lines.map(line => {
        if (line.trim() === "") return line;
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID && cols[2] === date) {
            cols[9] = String(newValue);
            return cols.join(",");
        }
        return line;
    });

    fs.writeFileSync(textFile, updatedLines.join("\n"), { encoding: "utf8" });
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const fileContent = fs.readFileSync(textFile, { encoding: "utf8" });
    const lines = fileContent.split("\n").filter(l => l.trim() !== "");

    const monthNum = parseInt(month, 10);

    let driverFound = false;
    let count = 0;

    for (const line of lines) {
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID) {
            driverFound = true;
            const recordMonth = parseInt(cols[2].split("-")[1], 10);
            if (recordMonth === monthNum && cols[9].toLowerCase() === "true") {
                count++;
            }
        }
    }

    if (!driverFound) return -1;
    return count;
}
// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const fileContent = fs.readFileSync(textFile, { encoding: "utf8" });
    const lines = fileContent.split("\n").filter(l => l.trim() !== "");

    let totalSeconds = 0;

    for (const line of lines) {
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID) {
            const recordMonth = parseInt(cols[2].split("-")[1], 10);
            if (recordMonth === month) {
                totalSeconds += parseDurationToSeconds(cols[7]);
            }
        }
    }

    return formatDurationLong(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const fileContent = fs.readFileSync(textFile, { encoding: "utf8" });
    const lines = fileContent.split("\n").filter(l => l.trim() !== "");

    const rateContent = fs.readFileSync(rateFile, { encoding: "utf8" });
    const rateLines = rateContent.split("\n").filter(l => l.trim() !== "");

    // Get driver's dayOff
    let dayOff = null;
    for (const line of rateLines) {
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID) {
            dayOff = cols[1].trim();
            break;
        }
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    let totalRequiredSeconds = 0;

    for (const line of lines) {
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID) {
            const dateStr = cols[2];
            const recordMonth = parseInt(dateStr.split("-")[1], 10);
            if (recordMonth !== month) continue;

            // Check if this day is driver's day off
            const d = new Date(dateStr);
            const dayName = dayNames[d.getDay()];
            if (dayOff && dayName === dayOff) continue;

            // Determine quota for this day
            const year = d.getFullYear();
            const dayOfMonth = d.getDate();
            let quotaSec;
            if (year === 2025 && recordMonth === 4 && dayOfMonth >= 10 && dayOfMonth <= 30) {
                quotaSec = 6 * 3600;
            } else {
                quotaSec = 8 * 3600 + 24 * 60;
            }

            totalRequiredSeconds += quotaSec;
        }
    }

    // Reduce by 2 hours per bonus
    const bonusReduction = bonusCount * 2 * 3600;
    totalRequiredSeconds = Math.max(0, totalRequiredSeconds - bonusReduction);

    return formatDurationLong(totalRequiredSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    const rateContent = fs.readFileSync(rateFile, { encoding: "utf8" });
    const rateLines = rateContent.split("\n").filter(l => l.trim() !== "");

    let basePay = 0;
    let tier = 1;

    for (const line of rateLines) {
        const cols = line.split(",").map(c => c.trim());
        if (cols[0] === driverID) {
            basePay = parseInt(cols[2], 10);
            tier = parseInt(cols[3], 10);
            break;
        }
    }

    const allowedMissingHours = { 1: 50, 2: 20, 3: 10, 4: 3 };
    const allowed = allowedMissingHours[tier] || 0;

    const actualSec = parseDurationToSeconds(actualHours);
    const requiredSec = parseDurationToSeconds(requiredHours);

    if (actualSec >= requiredSec) {
        return basePay;
    }

    const missingSec = requiredSec - actualSec;
    const missingHours = missingSec / 3600; // in fractional hours

    // Subtract allowed missing hours
    const billableMissingHours = missingHours - allowed;

    if (billableMissingHours <= 0) {
        return basePay;
    }

    // Only full hours count
    const billableFullHours = Math.floor(billableMissingHours);

    const deductionRatePerHour = Math.floor(basePay / 185);
    const salaryDeduction = billableFullHours * deductionRatePerHour;

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
