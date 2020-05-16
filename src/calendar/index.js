import React, { Component } from 'react';
import { View, ViewPropTypes, TouchableOpacity, TouchableHighlight, Text, AsyncStorage } from 'react-native';
import { getApi, getColor } from '../../../../src/common/common';
import Amplify, { API } from 'aws-amplify';
import PropTypes from 'prop-types';
import XDate from 'xdate';

import dateutils from '../dateutils';
import { xdateToData, parseDate } from '../interface';
import styleConstructor from './style';
import Day from './day/basic';
import UnitDay from './day/period';
import MultiDotDay from './day/multi-dot';
import MultiPeriodDay from './day/multi-period';
import SingleDay from './day/custom';
import CalendarHeader from './header';
import shouldComponentUpdate from './updater';
import { SELECT_DATE_SLOT } from '../testIDs';
import { FlingGestureHandler, State, Directions } from 'react-native-gesture-handler';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import styles from '../../../../src/screens/AddScreen/style';

//Fallback when RN version is < 0.44
const viewPropTypes = ViewPropTypes || View.propTypes;
const EmptyArray = [];

//주수에 따른 달력 높이 설정 위한 변수
var days_len;
//클릭한 날짜와 일정의 날짜가 같은 목록을 저장하는 배열
const day_index = [];

/**
 * @description: Calendar component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/calendars.js
 * @gif: https://github.com/wix/react-native-calendars/blob/master/demo/calendar.gif
 */
class Calendar extends Component {
  static displayName = 'Calendar';

  static propTypes = {
    /** Specify theme properties to override specific styles for calendar parts. Default = {} */
    theme: PropTypes.object,
    /** Collection of dates that have to be marked. Default = {} */
    markedDates: PropTypes.object,
    /** Specify style for calendar container element. Default = {} */
    style: viewPropTypes.style,
    /** Initially visible month. Default = Date() */
    current: PropTypes.any,
    /** Minimum date that can be selected, dates before minDate will be grayed out. Default = undefined */
    minDate: PropTypes.any,
    /** Maximum date that can be selected, dates after maxDate will be grayed out. Default = undefined */
    maxDate: PropTypes.any,
    /** If firstDay=1 week starts from Monday. Note that dayNames and dayNamesShort should still start from Sunday. */
    firstDay: PropTypes.number,
    /** Date marking style [simple/period/multi-dot/multi-period]. Default = 'simple' */
    markingType: PropTypes.string,
    /** Hide month navigation arrows. Default = false */
    hideArrows: PropTypes.bool,
    /** Display loading indicator. Default = false */
    displayLoadingIndicator: PropTypes.bool,
    /** Do not show days of other months in month page. Default = false */
    hideExtraDays: PropTypes.bool,
    /** Handler which gets executed on day press. Default = undefined */
    onDayPress: PropTypes.func,
    /** Handler which gets executed on day long press. Default = undefined */
    onDayLongPress: PropTypes.func,
    /** Handler which gets executed when month changes in calendar. Default = undefined */
    onMonthChange: PropTypes.func,
    /** Handler which gets executed when visible month changes in calendar. Default = undefined */
    onVisibleMonthsChange: PropTypes.func,
    /** Replace default arrows with custom ones (direction can be 'left' or 'right') */
    renderArrow: PropTypes.func,
    /** Provide custom day rendering component */
    dayComponent: PropTypes.any,
    /** Month format in calendar title. Formatting values: http://arshaw.com/xdate/#Formatting */
    monthFormat: PropTypes.string,
    /** Disables changing month when click on days of other months (when hideExtraDays is false). Default = false */
    disableMonthChange: PropTypes.bool,
    /**  Hide day names. Default = false */
    hideDayNames: PropTypes.bool,
    /** Disable days by default. Default = false */
    disabledByDefault: PropTypes.bool,
    /** Show week numbers. Default = false */
    showWeekNumbers: PropTypes.bool,
    /** Handler which gets executed when press arrow icon left. It receive a callback can go back month */
    onPressArrowLeft: PropTypes.func,
    /** Handler which gets executed when press arrow icon right. It receive a callback can go next month */
    onPressArrowRight: PropTypes.func,
    /** Disable left arrow. Default = false */
    disableArrowLeft: PropTypes.bool,
    /** Disable right arrow. Default = false */
    disableArrowRight: PropTypes.bool,
    /** Style passed to the header */
    headerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.array]),
    /** Provide aria-level for calendar heading for proper accessibility when used with web (react-native-web) */
    webAriaLevel: PropTypes.number,
    /** calendar flag */
    calendar_flag: PropTypes.bool
  };


  constructor(props) {
    super(props);


    this.style = styleConstructor(this.props.theme);

    this.state = {
      currentMonth: props.current ? parseDate(props.current) : XDate(),
      currentMonth_save: props.current ? parseDate(props.current) : XDate(),
      currentMonth_home: props.current ? parseDate(props.current) : XDate(),
      dayBorder: props.current ? parseDate(props.current).toString('yyyy-MM-dd') : XDate().toString('yyyy-MM-dd'),
      email: "",
      toDoList: []
    };

    this.updateMonth = this.updateMonth.bind(this);
    this.addMonth = this.addMonth.bind(this);
    this.pressDay = this.pressDay.bind(this);
    this.longPressDay = this.longPressDay.bind(this);
    this.shouldComponentUpdate = shouldComponentUpdate;
  }

  componentDidMount = async () => {

    await AsyncStorage.getItem("email", (errs, result) => {
      if (!errs) {
        if (result !== null) {
          this.setState({ "email": result });
        }
      }
    });

    const path = "/todolist/getAllDayList/" + JSON.parse(this.state.email);
    const response = await getApi("ApiToDoList", path);

    this.setState({ toDoList: response });
    this.forceUpdate();
  }

  //날짜 클릭시 dayBorder state 해당 날짜로 변경
  changeDayBorder(flag, day) {
    if (flag)
      this.setState({ dayBorder: day });
    else {
      this.setState({ dayBorder: day.dateString });
      this.props.toggleCalendarModal();
      this.props.setDateModal(day.month, day.day, new Date(day.dateString).getDay())
    }
    this._handleDayInteraction(day, this.props.onDayPress);
  }

  //swipe 기능 설정
  _onLeftFlingHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      this.addMonth(1);
    }
  }

  //swipe 기능 설정
  _onRightFlingHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      this.addMonth(-1);
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const current = parseDate(nextProps.current);
    if (current && current.toString('yyyy MM') !== this.state.currentMonth.toString('yyyy MM')) {
      this.setState({
        currentMonth: current.clone()
      });
    }
  }

  updateMonth(day, doNotTriggerListeners) {

    if (day.toString('yyyy MM') === this.state.currentMonth.toString('yyyy MM')) {
      return;
    }
    this.setState({
      currentMonth: day.clone()
    }, () => {
      if (!doNotTriggerListeners) {
        const currMont = this.state.currentMonth.clone();

        if (this.props.calendar_flag)
          //메인화면의 년과 월을 바꾸는 함수 호출
          this.props.changeYearMonth(this.state.currentMonth);


        if (this.props.onMonthChange) {
          this.props.onMonthChange(xdateToData(currMont));
        }
        if (this.props.onVisibleMonthsChange) {
          this.props.onVisibleMonthsChange([xdateToData(currMont)]);
        }
      }
    });

  }

  _handleDayInteraction(date, interaction) {
    const day = parseDate(date);
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);

    if (!(minDate && !dateutils.isGTE(day, minDate)) && !(maxDate && !dateutils.isLTE(day, maxDate))) {
      const shouldUpdateMonth = this.props.disableMonthChange === undefined || !this.props.disableMonthChange;
      if (shouldUpdateMonth) {
        this.updateMonth(day);
      }
      if (interaction) {
        interaction(xdateToData(day));
      }
    }
  }

  pressDay(date) {
    this._handleDayInteraction(date, this.props.onDayPress);
    if (this.props.calendar_flag)
      this.changeDayBorder(false, date);
  }

  longPressDay(date) {
    this._handleDayInteraction(date, this.props.onDayLongPress);
  }

  addMonth(count) {
    const date = this.state.currentMonth.toString("dd");
    this.updateMonth(this.state.currentMonth.clone().addMonths(count, true));
    if (this.state.currentMonth.clone().addMonths(count, true).toString("yyyy-MM") == this.state.currentMonth_save.toString("yyyy-MM"))
      this.setState({ dayBorder: this.state.currentMonth_save.toString('yyyy-MM-dd') });
    else {
      this.setState({ dayBorder: this.state.currentMonth.clone().addMonths(count, true).toString("yyyy-MM-dd").replace(date, "01") });
    }
  }

  renderDay(day, id) {
    const minDate = parseDate(this.props.minDate);
    const maxDate = parseDate(this.props.maxDate);
    let state = '';
    if (this.props.disabledByDefault) {
      state = 'disabled';
    } else if ((minDate && !dateutils.isGTE(day, minDate)) || (maxDate && !dateutils.isLTE(day, maxDate))) {
      state = 'disabled';
    } else if (!dateutils.sameMonth(day, this.state.currentMonth)) {
      state = 'disabled';
    } else if (dateutils.sameDate(day, XDate())) {
      state = 'today';
    }

    if (!dateutils.sameMonth(day, this.state.currentMonth) && this.props.hideExtraDays) {
      return (<View key={id} style={{ flex: 1 }} />);
    }

    const DayComp = this.getDayComponent();
    const date = day.getDate();
    const dateAsObject = xdateToData(day);
    const accessibilityLabel = `${state === 'today' ? 'today' : ''} ${day.toString('dddd MMMM d')} ${this.getMarkingLabel(day)}`;
    const days = dateutils.page(this.state.currentMonth, this.props.firstDay);
    let i = 0;

    if (days.length < 36)
      days_len = "25.4%";
    else
      days_len = "21.9%";

    if (this.props.calendar_flag)
      return (
        <TouchableOpacity onPress={() => { this.changeDayBorder(true, day.toString('yyyy-MM-dd')); this.props.toggleCalendarModal(); this.props.setDateModal(dateAsObject.month, dateAsObject.day, day.toString().substring(0, 3)) }} >
          <View style={[this.style.home_day, { height: wp(days_len) }, this.state.dayBorder === day.toString('yyyy-MM-dd') ? { borderWidth: 1, borderColor: "purple" } : { borderWidth: 0 }]} key={day} >
            <View style={{ /* flex: 1,  */alignItems: 'center', height: wp("6%") }} key={id}>
              <DayComp
                testID={`${SELECT_DATE_SLOT}-${dateAsObject.dateString}`}
                state={state}
                theme={this.props.theme}
                onPress={this.pressDay}
                onLongPress={this.longPressDay}
                date={dateAsObject}
                /* marking={this.getDateMarking(day)} */
                accessibilityLabel={accessibilityLabel}
              >
                {date}
              </DayComp>

            </View>
            {this.state.toDoList && (this.state.toDoList.map(todo_list => {
              if (day.toString('yyyy.MM.dd') === todo_list.end_date.substring(0, 10))
                return (
                  <View style={this.style.toDoContent}>
                    <View style={[this.style.toDo_theme, { backgroundColor: getColor(todo_list.color) }]} >
                 {/*    <View style={this.style.toDo_text}> */}
                      <Text style={{ fontSize: 10, color: "white" }}>{todo_list.title}</Text>
                    </View>
                  </View>
                )
            }))}
          </View>

        </TouchableOpacity>

      );

    else
      return (
        <View style={{ flex: 1, alignItems: 'center' }} key={id}>
          <DayComp
            testID={`${SELECT_DATE_SLOT}-${dateAsObject.dateString}`}
            state={state}
            theme={this.props.theme}
            onPress={this.pressDay}
            onLongPress={this.longPressDay}
            date={dateAsObject}
            marking={this.getDateMarking(day)}
            accessibilityLabel={accessibilityLabel}
          >
            {date}
          </DayComp>
        </View>
      );

  }

  getMarkingLabel(day) {
    let label = '';
    const marking = this.getDateMarking(day);

    if (marking.accessibilityLabel) {
      return marking.accessibilityLabel;
    }

    if (marking.selected) {
      label += 'selected ';
      if (!marking.marked) {
        label += 'You have no entries for this day ';
      }
    }
    if (marking.marked) {
      label += 'You have entries for this day ';
    }
    if (marking.startingDay) {
      label += 'period start ';
    }
    if (marking.endingDay) {
      label += 'period end ';
    }
    if (marking.disabled || marking.disableTouchEvent) {
      label += 'disabled ';
    }
    return label;
  }

  getDayComponent() {
    if (this.props.dayComponent) {
      return this.props.dayComponent;
    }

    switch (this.props.markingType) {
      case 'period':
        return UnitDay;
      case 'multi-dot':
        return MultiDotDay;
      case 'multi-period':
        return MultiPeriodDay;
      case 'custom':
        return SingleDay;
      default:
        return Day;
    }

  }

  getDateMarking(day) {

    if (!this.props.markedDates) {
      return false;
    }

    const dates = this.props.markedDates[day.toString('yyyy-MM-dd')] || EmptyArray;
    if (dates.length || dates) {
      return dates;
    } else {
      return false;
    }

  }

  renderWeekNumber(weekNumber) {
    return (
      <Day
        key={`week-${weekNumber}`}
        theme={this.props.theme}
        marking={{ disableTouchEvent: true }}
        state='disabled'
      >
        {weekNumber}
      </Day>
    );
  }

  renderWeek(days, id) {
    const week = [];
    days.forEach((day, id2) => {
      week.push(this.renderDay(day, id2));
    }, this);

    if (this.props.showWeekNumbers) {
      week.unshift(this.renderWeekNumber(days[days.length - 1].getWeek()));
    }

    if (this.props.calendar_flag)
      return (<View style={[this.style.home_week, { height: wp(days_len) }]} key={id}>{week}
      </View>);
    else
      return (<View style={this.style.week} key={id}>{week}</View>);
  }

  render() {
    const days = dateutils.page(this.state.currentMonth, this.props.firstDay);
    const weeks = [];
    while (days.length) {
      weeks.push(this.renderWeek(days.splice(0, 7), weeks.length));
    }

    let indicator;
    const current = parseDate(this.props.current);
    if (current) {
      const lastMonthOfDay = current.clone().addMonths(1, true).setDate(1).addDays(-1).toString('yyyy-MM-dd');
      if (this.props.displayLoadingIndicator &&
        !(this.props.markedDates && this.props.markedDates[lastMonthOfDay])) {
        indicator = true;
      }
    }


    if (this.props.calendar_flag) {

      return (
        <View
          style={[this.style.home_container, this.props.style]}
          accessibilityElementsHidden={this.props.accessibilityElementsHidden} // iOS
          importantForAccessibility={this.props.importantForAccessibility} // Android
        >
          <CalendarHeader
            testID={this.props.testID}
            ref={c => this.header = c}
            style={this.props.headerStyle}
            theme={this.props.theme}
            hideArrows={this.props.hideArrows}
            month={this.state.currentMonth}
            addMonth={this.addMonth}
            showIndicator={indicator}
            firstDay={this.props.firstDay}
            renderArrow={this.props.renderArrow}
            monthFormat={this.props.monthFormat}
            hideDayNames={this.props.hideDayNames}
            weekNumbers={this.props.showWeekNumbers}
            onPressArrowLeft={this.props.onPressArrowLeft}
            onPressArrowRight={this.props.onPressArrowRight}
            webAriaLevel={this.props.webAriaLevel}
            disableArrowLeft={this.props.disableArrowLeft}
            disableArrowRight={this.props.disableArrowRight}
          />
          <FlingGestureHandler
            ref={ref => this.leftFlinger = ref}
            direction={Directions.LEFT}
            onHandlerStateChange={ev =>
              this._onLeftFlingHandlerStateChange(ev)
            }>
            <FlingGestureHandler
              ref={ref => this.rightFlinger = ref}
              direction={Directions.RIGHT}
              onHandlerStateChange={ev =>
                this._onRightFlingHandlerStateChange(ev)
              }>
              <View style={this.style.home_monthView} key={"month"}>{weeks}
              </View>
            </FlingGestureHandler>
          </FlingGestureHandler>
        </View>
      );
    }

    else {

      return (
        <View
          style={[this.style.container, this.props.style]}
          accessibilityElementsHidden={this.props.accessibilityElementsHidden} // iOS
          importantForAccessibility={this.props.importantForAccessibility} // Android
        >
          <CalendarHeader
            testID={this.props.testID}
            ref={c => this.header = c}
            style={this.props.headerStyle}
            theme={this.props.theme}
            hideArrows={this.props.hideArrows}
            month={this.state.currentMonth}
            addMonth={this.addMonth}
            showIndicator={indicator}
            firstDay={this.props.firstDay}
            renderArrow={this.props.renderArrow}
            monthFormat={this.props.monthFormat}
            hideDayNames={this.props.hideDayNames}
            weekNumbers={this.props.showWeekNumbers}
            onPressArrowLeft={this.props.onPressArrowLeft}
            onPressArrowRight={this.props.onPressArrowRight}
            webAriaLevel={this.props.webAriaLevel}
            disableArrowLeft={this.props.disableArrowLeft}
            disableArrowRight={this.props.disableArrowRight}
          />
          <FlingGestureHandler
            ref={ref => this.leftFlinger = ref}
            direction={Directions.LEFT}
            onHandlerStateChange={ev =>
              this._onLeftFlingHandlerStateChange(ev)
            }>
            <FlingGestureHandler
              ref={ref => this.rightFlinger = ref}
              direction={Directions.RIGHT}
              onHandlerStateChange={ev =>
                this._onRightFlingHandlerStateChange(ev)
              }>
              <View style={this.style.monthView} key={"month"}>{weeks}
              </View>
            </FlingGestureHandler>
          </FlingGestureHandler>
        </View>
      );
    }
  }

}

export default Calendar;