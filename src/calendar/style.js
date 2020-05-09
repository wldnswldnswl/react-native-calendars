import {StyleSheet} from 'react-native';
import * as defaultStyle from '../style';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen'; 

const STYLESHEET_ID = 'stylesheet.calendar.main';

export default function getStyle(theme={}) {
  const appStyle = {...defaultStyle, ...theme};
  return StyleSheet.create({
    container: {
      paddingLeft: 5,
      paddingRight: 5,
      backgroundColor: appStyle.calendarBackground
    },
    monthView: {
      backgroundColor: appStyle.calendarBackground
    },
    week: {
      marginTop: 7,
      marginBottom: 7,
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    home_container: {
      width:wp("100%"),
      height: hp("100%")
    },
    home_monthView: {
      height: hp("100%")
    },
    home_week: {
      marginBottom: 0.5,
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: wp("100%")
    },
    home_day: {
      flex:1,
      alignItems:'center',
      width:wp("14%")
    },
    dayContent: {
      flexDirection:'row',
      top:wp("1%")
    },
    dayContent_theme: {
      width:wp("0.7%"),
      height:hp("1.7%")
    },
    dayContent_text: {
      width:wp("12%"),
      height:hp("1.7%")
    },
    ...(theme[STYLESHEET_ID] || {})
  });
}
