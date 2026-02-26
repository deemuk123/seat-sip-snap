import { motion } from "framer-motion";
import { Film, Clock, Monitor, Languages, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockShows } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

const ShowSelection = () => {
  const navigate = useNavigate();
  const { selectShow } = useApp();

  const handleSelectShow = (show: typeof mockShows[0]) => {
    selectShow(show);
    navigate("/delivery");
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">BigMovies</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Select Your Show</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a show to order food & beverages
        </p>
      </motion.div>

      {/* Shows List */}
      <div className="space-y-4">
        {mockShows.map((show, index) => (
          <motion.button
            key={show.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => handleSelectShow(show)}
            className="w-full text-left rounded-xl bg-card border border-border p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-lg text-foreground truncate">
                  {show.movieName}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {show.showTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-primary" />
                    Screen {show.screenNumber}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-primary" />
                    {show.language}
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                {show.format}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ShowSelection;
