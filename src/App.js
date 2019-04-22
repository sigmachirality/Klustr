import React, { Component } from 'react';
import './App.css';
import { Collapse, Switch, Loading, Layout } from 'element-react';
import Select from 'react-select';
import Slider, { createSliderWithTooltip } from 'rc-slider';
import 'rc-slider/assets/index.css';
import PropMap from './components/PropMap'
import 'element-theme-default';
import papa from 'papaparse';
import { taffy } from 'taffydb';
import { i18n } from 'element-react'
import locale from 'element-react/src/locale/lang/en'
const SliderWithTooltip = createSliderWithTooltip(Slider.Range);
i18n.use(locale);
const csvPath = './data.csv';

function titleCase(str) {
  if (!str) {
    return "";
  }
  return String(str).split('_').join(' ').toLowerCase().split(' ').map(function (word) {
    return word.length > 0 ? word.replace(word[0], word[0].toUpperCase()) : "";
  }).join(' ');
}

function linspace(a, b, n) {
  if (typeof n === "undefined") n = Math.max(Math.round(b - a) + 1, 1);
  if (n < 2) { return n === 1 ? [a] : []; }
  let i, nums = Array(n);
  n--;
  for (i = n; i >= 0; i--) { nums[i] = (i * b + (n - i) * a) / n; }
  let ret = {};
  nums.map(num => {
    ret[num] = String(num.toFixed(2));
  });
  return ret;
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      db: taffy(),
      properties: [],
      selectors: [],
      sliders: [],
      collapse: [],
      query: {},
      clustering: true,
      loading: true
    };
    this.parseProperties = this.parseProperties.bind(this);
    this.updateField = this.updateField.bind(this);
    this.finishLoading = this.finishLoading.bind(this);
    this.initializeFilters = this.initializeFilters.bind(this);
  }

  parseProperties(csv) {
    papa.parse(csv, {
      download: true,
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
      step: ((row) => {
        this.state.db.insert(row.data);
      }),
      complete: (() => {
        this.initializeFilters();
      })
    });
  }

  updateField(field, value) {
    this.setState({ loading: true }, () => {
      let numQuery = {};
      numQuery[field] = { isNumber: false };
      let query = this.state.query;
      if (this.state.db(numQuery).count() > 0) {
        if (value.length > 0) {
          query[field] = value;
        } else {
          delete query[field];
        }
      } else {
        query[field] = {
          "gte": value[0],
          "lte": value[1]
        }
      }
      this.setState({ query: query, loading: false, properties: this.state.db(query).get() });
    });
  }

  initializeFilters() {
    let first = this.state.db().first();
    let sliders = [];
    let selectors = [];
    let initial = {};
    Object.keys(first).slice(0, -2).map((field, index) => {
      let numQuery = {};
      numQuery[field] = { isNumber: false };
      if (this.state.db(numQuery).count() > 0) {
        let options = this.state.db()
          .distinct(field)
          .filter((value) => value != null)
          .map((option) => ({ value: option, label: titleCase(option) }));
        selectors.push(
          <div>
            <h4 style={{ marginBottom: "0" }}>{titleCase(field)}</h4>
            <br />
            <Select
              isMulti
              key={field + index}
              options={options}
              onChange={(values) => this.updateField(field, values.map((value) => value.value))}
            />
          </div>
        );
      } else {
        let min = this.state.db().min(field);
        let max = this.state.db().max(field);
        if (min !== max) {
          if (field === "Latitude" || field === "Longitude") {
            sliders.push(
              <div>
                <h4>{titleCase(field)}</h4>
                <Slider.Range
                  key={field}
                  style={{ width: "90%", marginLeft: "5%", marginBottom: "30px" }}
                  allowCross={false}
                  min={min} max={max}
                  marks={linspace(min, max, 5)}
                  step={null}
                  defaultValue={[min, max]}
                  onAfterChange={(value) => this.updateField(field, value)}
                />
              </div>);
          } else {
            initial[field] = [min, max];
            sliders.push(
              <div>
                <h4>{titleCase(field)}</h4>
                <SliderWithTooltip
                  key={field}
                  style={{ width: "90%", marginLeft: "5%" }}
                  allowCross={false}
                  min={min} max={max}
                  defaultValue={[min, max]}
                  onAfterChange={(value) => this.updateField(field, value)}
                />
              </div>);
          }
        }
      }
    });
    this.setState({ selectors: selectors, sliders: sliders, properties: this.state.db().get(), loading: false });
  }

  finishLoading() {
    this.setState((state) => {
      if (state.loading) {
        return {
          loading: false
        };
      } else {
        return null;
      }
    });
  }

  componentDidMount() {
    this.parseProperties(csvPath);
  }

  render() {
    console.log("rendered - " + this.state.loading);
    return (
      <Layout.Row>
        {this.state.loading && <Loading fullscreen={true} />}
        <Layout.Col span={6} style={{ height: `100vh`, overflow: 'auto' }}>
          <h1>&nbsp; Klustr</h1>
          <div style= {{borderTop: "1px solid #dfe6ec", borderBottom: "1px solid #dfe6ec"}}>
            <br />
            <Switch
              style={{marginLeft: "10px"}}
              value={this.state.clustering}
              onText="On"
              offText="Off"
              onChange={(value) => this.setState({ clustering: value })}
            />
            <span>&nbsp; Toggle Clustering</span>
            <br />
            <br />
          </div>
          <Collapse
            value={this.state.collapse}
            onChange={(value) => {
              this.state.collapse = value;
            }}
          >
            <Collapse.Item title="Categorial Filters" name="cat">
              {this.state.selectors}
              <div style={{ height: "15vh" }}></div>
            </Collapse.Item>
            <Collapse.Item title="Numeric Filters" name="num">
              {this.state.sliders}
            </Collapse.Item>
          </Collapse>
        </Layout.Col>
        <Layout.Col span={18}>
          {<PropMap
            min={this.state.db().min('ESTIMATED_MARKET_VALUE')}
            max={this.state.db().max('ESTIMATED_MARKET_VALUE')}
            markers={this.state.properties}
            googleMapURL="https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,drawing,places&key=AIzaSyCYx9z_pysuiZVGSWnICG4dKVTGuThLqJY"
            loadingElement={
              <div>
              <Loading fullscreen={true} />
            </div>}
            containerElement={
              <div style={{ height: `100vh` }}>
              </div>
            }
            mapElement={<div style={{ height: `100%` }} />}
            onMarkerEnter={this.handleMarkerEnter}
            onMarkerExit={this.handleMarkerExit}
            clustering={this.state.clustering}
            parent={this}
          />}
        </Layout.Col>
      </Layout.Row>
    );
  }
}

export default App;
