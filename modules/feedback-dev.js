console.log("JS loaded");
// try {
//   alert(window.location.href);
//   alert(document.location.href);
// } catch {
//   alert("oops");
// }
let checkTimer = null;
let questionaireStatus = null; // null | 'submitted'
let questionairePromptedInClass = false;
let isLeavingClass = false;
let isEndingClass = false;
const questionaireTaskId = "custom-task-questionaire";
let customParam = new URLSearchParams(
  window.location.href || document.location.href
);
let feedbackSetting = customParam.get("feedbackSetting").trim();

// wait until joined class
TCIC.SDK.instance.promiseState(TCIC.TMainState.Joined_Class, true).then(() => {
  // check if current user is teacher
  if (TCIC.SDK.instance.isTeacher() && feedbackSetting != "disabled") {
    onTeacherJoinedClass();
  }
});

// called after teacher joined class
const onTeacherJoinedClass = () => {
  loadQuestionaireStatus().then(() => {
    TCIC.SDK.instance.subscribeState(
      TCIC.TMainState.Class_Status,
      (classStatus) => {
        // only check if class not ended
        if (classStatus === TCIC.TClassStatus.Already_Start) {
          // // wait until device detection finished
          TCIC.SDK.instance
            .promiseState("TStateDeviceDetect", false)
            .then(() => {
              startCheckTimer();
            });
          // startCheckTimer();
        } else {
          stopCheckTimer();
        }
      }
    );

    //show questionaire if "End Class" button has been clicked
    const endClassButton = document.querySelector(".header__button--start");
    endClassButton.addEventListener(
      "click",
      (event) => {
        if (
          TCIC.SDK.instance.getState(TCIC.TMainState.Class_Status) ===
            TCIC.TClassStatus.Already_Start &&
          questionaireStatus !== "submitted"
        ) {
          event.stopPropagation();
          showEndClassMsgBox();
          // showQuestionaire(true);
        }
      },
      {
        capture: true,
      }
    );
  });
};
// status from tencent server
const loadQuestionaireStatus = () =>
  TCIC.SDK.instance
    .getTasks(0, true)
    .then((result) => {
      const questionaireTask = result.tasks.find(
        (task) => task.taskId === questionaireTaskId
      );
      if (questionaireTask) {
        const content = JSON.parse(questionaireTask.content);
        questionaireStatus = content.status;
        questionairePromptedInClass = content.promptedInClass;
      }
    })
    .catch((err) => {});

// start periodical check , calls checkShowQuestionaire method in setInterval
const startCheckTimer = () => {
  if (checkTimer) return;
  checkTimer = setInterval(checkShowQuestionaire, 1000);
};

// stop periodical check
const stopCheckTimer = () => {
  if (!checkTimer) return;
  clearInterval(checkTimer);
  checkTimer = null;
};

// check when to show questionaire
const checkShowQuestionaire = () => {
  console.log(TCIC.TMainState.Class_Status);
  // prompt only once
  if (questionairePromptedInClass) {
    return;
  }

  if (questionaireStatus === "submitted") {
    return;
  }

  const classEndTime = TCIC.SDK.instance.getClassInfo().endTime * 1000;
  const now = TCIC.SDK.instance.getServerTimestamp();

  // less than 5 minutes to the end of class
  if (now >= classEndTime - 5 * 60 * 1000) {
    showQuestionaire();

    // mark questionaire as prompted
    saveQuestionaireStatus({
      promptedInClass: true,
    });
  }
};

// method to trigger iframe
const showQuestionaire = (isLeaving) => {
  if (feedbackSetting == "disabled") return;
  isLeavingClass = isLeaving;
  // get room id
  const roomId = TCIC.SDK.instance.getClassInfo().classId;
  // construct URL to your questionaire (with roomId in query string)
  //  customParam = new URLSearchParams(
  //   window.location.href || document.location.href
  // );
  let sessionIdTms = customParam.get("sessionId");
  let boxIdTms = customParam.get("boxId");
  let contentIdTms = customParam.get("contentId");
  // window.location.href.split("session=")[1].split("&")[0] ||
  // window.location.href.split("session=")[1];
  const questionaireUrl = `https://tms.turito.com/give/class/feedback/${roomId}/${contentIdTms}/${sessionIdTms}/${boxIdTms}`;
  // alert(questionaireUrl);
  const randomUniqueIdentifier = Math.floor(Math.random() * 100);
  const modalEl = document.createElement("div");
  modalEl.innerHTML = `
  <div class="questionaire-modal__content">

    <iframe class="questionaire-modal__iframe" name="${randomUniqueIdentifier}" src="${questionaireUrl}"></iframe>
  </div>
`;
  modalEl.className = "questionaire-modal";
  modalEl.id = "questionaire-modal";
  document.body.appendChild(modalEl);
  // const closeIframeButton = document.querySelector("close-iframe-tms");
  // closeIframeButton.addEventListener("click", () => hideQuestionaire());
  // handleQuestionaireSubmit();
};

// status to tencent server
const saveQuestionaireStatus = (params) => {
  questionaireStatus =
    params.status !== undefined ? params.status : questionaireStatus;
  questionairePromptedInClass =
    params.promptedInClass !== undefined
      ? params.promptedInClass
      : questionairePromptedInClass;

  const content = JSON.stringify({
    status: questionaireStatus,
    promptedInClass: questionairePromptedInClass,
    timestamp: TCIC.SDK.instance.getServerTimestamp(),
  });

  TCIC.SDK.instance.updateTask(
    questionaireTaskId, // taskId
    content, // content
    -1, // duration
    false, // createOnly
    "", // bindingUser
    true // needCallback
  );
};

// utility to hide iframe modal
const hideQuestionaire = () => {
  // remove your questionaire modal
  const modalEl = document.getElementById("questionaire-modal");
  if (modalEl) {
    modalEl.remove();
  }
};

// callback if questionaire has been submitted
const handleQuestionaireSubmit = () => {
  setTimeout(() => {
    try {
      saveQuestionaireStatus({
        status: "submitted",
      });
    } catch (err) {
      alert("oops 2", err);
    }
    hideQuestionaire();
    // continue leaving class
    if (isLeavingClass) {
      isLeavingClass = false;
      TCIC.SDK.instance.leaveClass();
    }
    if (isEndingClass) {
      isEndingClass = false;
      tcicEndAndLeaveClass();
    }
  }, 10);
};

// callback if questionaire has been cancelled
const handleQuestionaireCancel = () => {
  hideQuestionaire();
  // continue leaving class
  if (isLeavingClass) {
    isLeavingClass = false;
    TCIC.SDK.instance.leaveClass();
  }
  if (isEndingClass) {
    isEndingClass = false;
    tcicEndAndLeaveClass();
  }
};

// postMessage from tms iframe
window.addEventListener("message", (e) => {
  // setTimeout(() => {
  //   try {
  //     handleQuestionaireSubmit();
  //   } catch (err) {
  //     alert("oops", err);
  //   }
  // }, 100);
  // const msg = e;
  console.log(e);
  // if (e.origin.includes("tms")) {
  // if (msg && msg.type === 'feedback-result') {
  switch (e.data) {
    case "feedback-submitted":
      handleQuestionaireSubmit();
      break;
    case "feedback-skip":
    case "feedback-fail":
    case "feedback-error":
      handleQuestionaireCancel();
      break;
  }
  // }
});

// show a custom "End Class" msgbox
const showEndClassMsgBox = () => {
  TCIC.SDK.instance.showMessageBox(
    // title
    "Are you sure you want to End/Leave the Class?",
    // message
    'Click on "End Class" to end the on-going Class.<br>Click on "Leave Class", if you want to re-join the Class later again.',
    // buttons
    ["Cancel", "Leave Class", "End Class"],
    // callback
    (btnIndex) => {
      if (btnIndex === 1) {
        // Leave Class

        TCIC.SDK.instance.unInitialize();
      } else if (btnIndex === 2) {
        // End Class
        if (
          questionaireStatus !== "submitted" &&
          feedbackSetting != "disabled"
        ) {
          // marked as "ending class", continue end class process until questionaire submitted or cancelled
          isEndingClass = true;
          showQuestionaire();
        } else {
          tcicEndAndLeaveClass();
        }
      }
    }
  );
};
// when end/leave class is clicked
const tcicEndAndLeaveClass = () => {
  TCIC.SDK.instance
    .endClass()
    .then(() => {
      TCIC.SDK.instance.unInitialize();
    })
    .catch((error) => {
      if (error.errorCode === 10301) {
        // class already ended
        TCIC.SDK.instance.unInitialize();
      } else {
        window.showToast(`End Class fail: ${error.errorMsg}`, "error");
      }
    });
};

// for debug usage only
// window.showQuestionaire = showQuestionaire;
// window.hideQuestionaire = hideQuestionaire;
// window.clearQuestionaireStatus = () => {
//   saveQuestionaireStatus({
//     status: null,
//   });
// };
