console.log("JS loaded");
try {
  alert(window.location.href);
  alert(document.location.href);
} catch {
  alert("oops");
}

let checkTimer = null;
let questionaireStatus = null; // null | 'submitted'
let questionairePromptedInClass = false;

const questionaireTaskId = "custom-task-questionaire";

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

  console.log("[feedback] updateTask", questionaireTaskId, content);

  TCIC.SDK.instance.updateTask(
    questionaireTaskId, // taskId
    content, // content
    -1, // duration
    false, // createOnly
    "", // bindingUser
    true // needCallback
  );
};

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
        console.log("[feedback] questionaireStatus", questionaireStatus);
        console.log(
          "[feedback] questionairePromptedInClass",
          questionairePromptedInClass
        );
      }
    })
    .catch((err) => {
      console.error("[feedback] loadQuestionaireStatus fail", err);
    });

// check if questionaire should be shown (5 mintues before the end of class)
const checkShowQuestionaire = () => {
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
  showQuestionaire();
  if (now < classEndTime) {
    console.log("if");

    // mark questionaire as prompted
    saveQuestionaireStatus({
      promptedInClass: true,
    });
  }
};

// start periodical check
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

// called after teacher joined class
const onTeacherJoinedClass = () => {
  loadQuestionaireStatus().then(() => {
    TCIC.SDK.instance.subscribeState(
      TCIC.TMainState.Class_Status,
      (classStatus) => {
        // only check if class not ended
        if (classStatus === TCIC.TClassStatus.Already_Start) {
          startCheckTimer();
        } else {
          stopCheckTimer();
        }
      }
    );

    // show questionaire if "End Class" button has been clicked
    const endClassButton = document.querySelector(".header__button--start");
    endClassButton.addEventListener(
      "click",
      (event) => {
        console.log("[feedback] End Class button has been clicked");

        if (
          TCIC.SDK.instance.getState(TCIC.TMainState.Class_Status) ===
            TCIC.TClassStatus.Already_Start &&
          questionaireStatus !== "submitted"
        ) {
          event.stopPropagation();
          showQuestionaire(true);
        }
      },
      {
        capture: true,
      }
    );
  });
};

// wait until joined class
TCIC.SDK.instance.promiseState(TCIC.TMainState.Joined_Class, true).then(() => {
  // check if current user is teacher
  if (TCIC.SDK.instance.isTeacher()) {
    onTeacherJoinedClass();
  }
});

let isLeavingClass = false;

const showQuestionaire = (isLeaving) => {
  console.log("[feedback] Showing questionaire");

  isLeavingClass = isLeaving;

  // get room id
  const roomId = TCIC.SDK.instance.getClassInfo().classId;

  // show your questionaire modal:

  // construct URL to your questionaire (with roomId in query string)
  // const questionaireUrl = `http://localhost:8088/embedded_questionaire.html?roomId=${roomId}`;
  const customParam = new URLSearchParams(
    window.location.href || document.location.href
  );
  customParam = customParam.get("session");
  alert(customParam);
  // window.location.href.split("session=")[1].split("&")[0] ||
  // window.location.href.split("session=")[1];
  alert(customParam);
  const questionaireUrl = `http://localhost:4200/give/class/feedback/${customParam}`;
  console.log(questionaireUrl);
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
};

const hideQuestionaire = () => {
  console.log("[feedback] Hiding questionaire");
  // remove your questionaire modal
  const modalEl = document.getElementById("questionaire-modal");
  if (modalEl) {
    modalEl.remove();
  }
};

// callback if questionaire has been submitted
const handleQuestionaireSubmit = () => {
  console.log("[feedback] Questionaire has been submitted");

  saveQuestionaireStatus({
    status: "submitted",
  });

  hideQuestionaire();

  // continue leaving class
  if (isLeavingClass) {
    isLeavingClass = false;
    TCIC.SDK.instance.leaveClass();
  }
};

// callback if questionaire has been cancelled
const handleQuestionaireCancel = () => {
  console.log("[feedback] Questionaire has been cancelled");

  hideQuestionaire();

  // continue leaving class
  if (isLeavingClass) {
    isLeavingClass = false;
    TCIC.SDK.instance.leaveClass();
  }
};

// process message from iframe
window.addEventListener("message", (e) => {
  const msg = e;
  console.log(msg);
  hideQuestionaire();
  setTimeout(() => showEndClassMsgBox(), 100);
  // if(e.origin.includes('tms'))
  // if (msg && msg.type === 'feedback-result') {
  //   switch (msg.data.result) {
  //     case 'submit':
  //       handleQuestionaireSubmit();
  //       break;
  //     case 'cancel':
  //       handleQuestionaireCancel();
  //       break;
  //   }
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
        console.log('[feedback] "Leave Class" button clicked');

        TCIC.SDK.instance.unInitialize();
      } else if (btnIndex === 2) {
        // End Class
        console.log('[feedback] "End Class" button clicked');

        if (questionaireStatus !== "submitted") {
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

const tcicEndAndLeaveClass = () => {
  console.log("end class popup");
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
window.showQuestionaire = showQuestionaire;
window.hideQuestionaire = hideQuestionaire;
window.clearQuestionaireStatus = () => {
  saveQuestionaireStatus({
    status: null,
  });
};
