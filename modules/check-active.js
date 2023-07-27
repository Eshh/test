let checkTimer = null;
let nextShowMsgBoxTime = 0;

// periodically check & show msgbox (called every seconds)
const checkShowMsgBox = () => {
  const classInfo = TCIC.SDK.instance.getClassInfo();

  // check if class is scheduled to be ended
  if (TCIC.SDK.instance.getServerTimestamp() < classInfo.endTime * 1000) {
    return;
  }

  // check if msgbox has been shown recently
  if (Date.now() < nextShowMsgBoxTime) {
    return;
  }

  const totalMemberCount = TCIC.SDK.instance.getState(TCIC.TMainState.Member_List_Total_Member_Count, 0);
  const offlineMemberCount = TCIC.SDK.instance.getState(TCIC.TMainState.Member_List_Offline_Member_Count, 0);
  const onlineCount = totalMemberCount - offlineMemberCount;

  // check online member count
  if (onlineCount !== 1) {
    return;
  }

  // all condition fulfilled and msgbox should be shown
  showCheckActiveMsgBox();
  // schedule next time to show msgbox
  nextShowMsgBoxTime = Date.now() + 10 * 60 * 1000;
};

// start periodical check
const startCheckTimer = () => {
  if (checkTimer) return;
  checkTimer = setInterval(checkShowMsgBox, 1000);
};

// stop periodical check
const stopCheckTimer = () => {
  if (!checkTimer) return;
  clearInterval(checkTimer);
  checkTimer = null;
};

// called after joined class
const onJoinedClass = () => {
  // called if class status changed
  TCIC.SDK.instance.subscribeState(TCIC.TMainState.Class_Status, (classStatus) => {
    // only check if class not ended
    if (classStatus === TCIC.TClassStatus.Already_Start) {
      startCheckTimer();
    } else {
      stopCheckTimer();
    }
  });
};

// wait until joined class
TCIC.SDK.instance.promiseState(TCIC.TMainState.Joined_Class, true)
  .then(() => {
    onJoinedClass();
  });

const checkActiveTaskId = 'custom-task-check-active';
let msgBoxId = 0;
let timer = null;

// use showMessageBox API to show a simple confirm modal, or implement your own msgbox
const showCheckActiveMsgBox = () => {
  if (msgBoxId) return;

  msgBoxId = TCIC.SDK.instance.showMessageBox(
    'Are you still in class?', // title
    'Please click yes, otherwise class will be ended in 5 minutes.', // message
    ['Yes'], // buttons
    (btnIndex) => { // onClose callback
      msgBoxId = null;

      // if "Yes" button clicked then
      if (btnIndex === 0) {
        console.log('[check-active] userClose');

        sendCheckResult('userClose');
        clearTimeout(timer);
      }
    },
  );

  timer = setTimeout(() => {
    console.log('[check-active] timeout');

    // if "Yes" button not clicked within 5 minutes then
    sendCheckResult('timeout');

    // class should be ended and no need to check & show msgbox anymore
    stopCheckTimer();

    // close the displaying msgbox
    requestAnimationFrame(() => {
      TCIC.SDK.instance.closeMessageBox(msgBoxId);
    });
  }, 5 * 60 * 1000);
};

const sendCheckResult = (result) => {
  // submit task status change to LCIC
  const content = JSON.stringify({
    status: result,
    userId: TCIC.SDK.instance.getUserId(),
    timestamp: TCIC.SDK.instance.getServerTimestamp(),
  });

  console.log('[check-active] updateTask', checkActiveTaskId, content);

  TCIC.SDK.instance.updateTask(
    checkActiveTaskId, // taskId
    content, // content
    -1, // duration
    false, // createOnly
    '', // bindingUser
    true, // needCallback
  );
};

// for debug only
window.showCheckActiveMsgBox = showCheckActiveMsgBox;
window.sendCheckResult = sendCheckResult;
