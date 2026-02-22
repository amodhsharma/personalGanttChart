import { useCallback, useEffect, useRef, useState } from "react";
import {
  DATE_DD_MM_YYYY_ERROR,
  DATE_DD_MM_YYYY_INPUT_PATTERN,
  parseDdMmYyyyToDate
} from "../Validations";

const GO_TO_CUSTOM_TIME_ID = "go-to-marker";

function addMonthsToDate(dateValue, monthsToAdd) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(year, month, clampedDay, hours, minutes, seconds, milliseconds);
}

export function useGoToLogic({ timelineRef, timelineContainerRef, setTimelineViewKey }) {
  const [showGoToControls, setShowGoToControls] = useState(false);
  const [goToInputValue, setGoToInputValue] = useState("");
  const [goToDate, setGoToDate] = useState(null);
  const goToInputRef = useRef(null);

  const updateGoToPinVerticalPosition = useCallback(() => {
    const timelineElement = timelineContainerRef.current;
    if (!timelineElement) return;
    const axisForeground = timelineElement.querySelector(".vis-time-axis.vis-foreground");
    const boundaryPx = axisForeground
      ? Math.round(axisForeground.offsetTop + axisForeground.offsetHeight)
      : 36;
    timelineElement.style.setProperty("--goto-pin-top", `${boundaryPx}px`);
  }, [timelineContainerRef]);

  const removeGoToCustomTimeMarker = useCallback(() => {
    if (!timelineRef.current) return;
    try {
      timelineRef.current.removeCustomTime(GO_TO_CUSTOM_TIME_ID);
    } catch {
      // no-op when marker is not present
    }
  }, [timelineRef]);

  const onClearGoTo = useCallback(() => {
    removeGoToCustomTimeMarker();
    setGoToDate(null);
    setGoToInputValue("");
    setShowGoToControls(false);
    goToInputRef.current?.setCustomValidity("");
  }, [removeGoToCustomTimeMarker]);

  const syncGoToCustomTimeMarker = useCallback(
    (targetDate) => {
      if (!timelineRef.current) return;
      const timeline = timelineRef.current;
      const markerDate = new Date(targetDate);

      try {
        timeline.setCustomTime(markerDate, GO_TO_CUSTOM_TIME_ID);
      } catch {
        timeline.addCustomTime(markerDate, GO_TO_CUSTOM_TIME_ID);
      }

      timeline.setCustomTimeMarker("×", GO_TO_CUSTOM_TIME_ID, false);
      timeline.setCustomTimeTitle("", GO_TO_CUSTOM_TIME_ID);

      const markerBar = timelineContainerRef.current?.querySelector(
        `.vis-custom-time.${GO_TO_CUSTOM_TIME_ID}`
      );
      markerBar?.classList.add("goto-custom-time");

      const markerPin = markerBar?.querySelector(".vis-custom-time-marker");
      if (markerPin) {
        markerPin.classList.add("goto-custom-time-pin");
        markerPin.setAttribute("role", "button");
        markerPin.setAttribute("aria-label", "Clear go-to marker");
        markerPin.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          onClearGoTo();
        };
      }

      window.requestAnimationFrame(() => {
        updateGoToPinVerticalPosition();
      });
    },
    [onClearGoTo, timelineContainerRef, timelineRef, updateGoToPinVerticalPosition]
  );

  const onToggleGoToControls = useCallback(() => {
    setShowGoToControls((current) => {
      const next = !current;
      if (next) {
        window.setTimeout(() => {
          goToInputRef.current?.focus();
        }, 0);
      } else {
        setGoToInputValue("");
        goToInputRef.current?.setCustomValidity("");
      }
      return next;
    });
  }, []);

  const onChangeGoToInput = useCallback((event) => {
    event.target.setCustomValidity("");
    setGoToInputValue(event.target.value);
  }, []);

  const onSubmitGoTo = useCallback(
    (event) => {
      event.preventDefault();
      const focusDate = parseDdMmYyyyToDate(goToInputValue);
      if (!focusDate) {
        goToInputRef.current?.setCustomValidity(DATE_DD_MM_YYYY_ERROR);
        goToInputRef.current?.reportValidity();
        return;
      }

      goToInputRef.current?.setCustomValidity("");
      syncGoToCustomTimeMarker(focusDate);
      setGoToDate(focusDate);
      setTimelineViewKey(null);

      if (timelineRef.current) {
        const leftBound = addMonthsToDate(focusDate, -1);
        const rightBound = addMonthsToDate(focusDate, 1);
        timelineRef.current.setWindow(leftBound, rightBound, { animation: false });
      }
    },
    [goToInputValue, setTimelineViewKey, syncGoToCustomTimeMarker, timelineRef]
  );

  const onTimelineRangeChanged = useCallback(() => {
    updateGoToPinVerticalPosition();
  }, [updateGoToPinVerticalPosition]);

  useEffect(() => {
    if (!timelineRef.current) return;
    if (!goToDate) {
      removeGoToCustomTimeMarker();
      return;
    }
    syncGoToCustomTimeMarker(goToDate);
  }, [goToDate, removeGoToCustomTimeMarker, syncGoToCustomTimeMarker, timelineRef]);

  useEffect(() => {
    window.addEventListener("resize", updateGoToPinVerticalPosition);
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateGoToPinVerticalPosition();
          })
        : null;
    if (timelineContainerRef.current) {
      resizeObserver?.observe(timelineContainerRef.current);
    }

    window.requestAnimationFrame(() => {
      updateGoToPinVerticalPosition();
    });

    return () => {
      window.removeEventListener("resize", updateGoToPinVerticalPosition);
      resizeObserver?.disconnect();
    };
  }, [timelineContainerRef, updateGoToPinVerticalPosition]);

  useEffect(() => {
    return () => {
      removeGoToCustomTimeMarker();
    };
  }, [removeGoToCustomTimeMarker]);

  return {
    goToInputPattern: DATE_DD_MM_YYYY_INPUT_PATTERN,
    goToInputRef,
    goToInputValue,
    onChangeGoToInput,
    onClearGoTo,
    onSubmitGoTo,
    onTimelineRangeChanged,
    onToggleGoToControls,
    showGoToControls
  };
}
